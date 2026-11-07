"""Hardware-free integration of route ownership, validation and plot completion."""
import copy
import sys
from pathlib import Path
from unittest.mock import Mock
import pytest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'src'))
import app as host
from modules.plotter_settings import PlotterSettings
from modules.calibration_session import CalibrationSession

@pytest.fixture
def api(tmp_path, monkeypatch):
    settings=PlotterSettings(str(tmp_path/'settings.json'))
    serial=Mock()
    serial.is_connected.return_value=False
    monkeypatch.setattr(host,'plotter_settings',settings)
    monkeypatch.setattr(host,'serial_handler',serial)
    monkeypatch.setattr(host,'calibration_session',CalibrationSession(serial,settings))
    monkeypatch.setattr(host,'is_plotting',False)
    monkeypatch.setattr(host,'save_progress',Mock())
    monkeypatch.setattr(host.socketio,'emit',Mock())
    return host.app.test_client(),settings,serial

def test_offline_preview_and_invalid_measurements(api):
    client,settings,serial=api
    reply=client.post('/api/calibration/preview',json={'outside_cover_span_mm':1100,'datum_height_mm':1500})
    assert reply.status_code==200
    assert reply.json['geometry']['motor_spacing']==1043
    assert reply.json['geometry']['anchor_y']==721.5
    assert reply.json['verified'] is False
    assert not serial.mock_calls
    assert not settings.get('calibrated')
    for bad in [None,True,'1100',float('inf'),-100]:
        assert client.post('/api/calibration/preview',json={'outside_cover_span_mm':bad,'datum_height_mm':1500}).status_code==400

def test_reference_requires_connected_controller(api):
    client,settings,serial=api
    assert client.post('/api/calibration/reference',json={'outside_cover_span_mm':1100,'datum_height_mm':1500,'reference_aligned':True,'paths_clear':True}).status_code==409
    serial.send_command.assert_not_called()

@pytest.mark.parametrize('path', ['/api/jog','/api/home','/api/goto','/api/send_gcode','/api/plot/start','/api/motors','/api/settings'])
def test_pending_calibration_blocks_old_clients_and_generic_mutations(api,path):
    client,settings,serial=api
    settings.set('calibration_pending',{'stage':'interrupted'})
    reply=client.post(path,json={})
    assert reply.status_code==409
    assert not serial.mock_calls

@pytest.mark.parametrize('path',['/api/calibrate/apply','/api/calibrate/spacing/solve','/api/calibrate/motion/autotune'])
def test_retired_calibration_cannot_overwrite_geometry(api,path):
    client,settings,serial=api
    assert client.post(path,json={}).status_code==410
    assert not serial.mock_calls

def test_geometry_cannot_bypass_verified_setup_through_settings(api):
    client,settings,serial=api
    assert client.post('/api/settings',json={'motor_spacing':999}).status_code==400
    assert settings.get('motor_spacing')!=999

def test_settings_failed_replace_preserves_disk_and_memory(api,monkeypatch):
    client,settings,serial=api
    settings.save(); old=Path(settings.config_path).read_text()
    before=settings.get_all()
    monkeypatch.setattr('modules.plotter_settings.os.replace', Mock(side_effect=OSError('disk full')))
    assert client.post('/api/settings',json={'pen_kerf':.6}).status_code==400
    assert settings.get_all()==before
    assert Path(settings.config_path).read_text()==old

def test_barrier_failure_never_emits_plot_complete(api,monkeypatch):
    client,settings,serial=api
    serial.wait_until_idle.return_value=False
    monkeypatch.setattr(host,'is_plotting',True)
    host.finish_plot()
    assert host.is_plotting is False
    assert host.socketio.emit.call_args[0][0]=='plot_error'
    serial.send_streaming.assert_not_called()

def test_confirmed_motion_and_pen_up_required_for_completion(api,monkeypatch):
    client,settings,serial=api
    serial.wait_until_idle.return_value=True
    serial.send_streaming.return_value=True
    monkeypatch.setattr(host,'is_plotting',True)
    host.finish_plot()
    assert serial.wait_until_idle.call_count==2
    assert host.socketio.emit.call_args[0][0]=='plot_complete'

def test_emergency_interrupts_setup_without_claiming_hardware_stopped(api):
    client,settings,serial=api
    settings.set('calibration_pending',{'stage':'homing'})
    serial.request_emergency_stop.return_value=True
    reply=client.post('/api/emergency_stop',json={})
    assert reply.json['stopped_verified'] is False
    assert host.calibration_session.status()['requires_restart'] is True
    serial.request_emergency_stop.assert_called_once()

def test_default_mutable_profiles_are_not_shared(tmp_path):
    a=PlotterSettings(str(tmp_path/'a.json')); b=PlotterSettings(str(tmp_path/'b.json'))
    a.get('pen_down_angles')['red']=20
    assert b.get('pen_down_angles')=={}

def test_pending_setup_can_reconnect_but_cannot_change_settings(api,monkeypatch):
    client,settings,serial=api
    settings.set('calibration_pending',{'stage':'interrupted'})
    serial.connect.return_value=True
    monkeypatch.setattr(host.time,'sleep',lambda _:None)
    reply=client.post('/api/connect',json={'port':'/dev/fake','baud':57600})
    assert reply.status_code==200 and reply.json['success']
    assert not any('G92' in str(call) for call in serial.send_command.call_args_list)


def test_bad_fit_shape_is_rejected_without_server_error(api):
    client,_,_=api
    assert client.post('/api/calibration/fit',json=[1,2,3]).status_code==400


def target_request():
    return {'x': -140, 'y': 175, 'expected_reference': 'setup:connection:7', 'paths_clear': True}


def capture_fixture(epoch=7):
    return {'session_id': 'setup', 'connection_id': 'connection', 'reference_epoch': epoch,
            'left_steps': -1234, 'right_steps': -5678, 'pulse_counts_only': True}


def prepare_target_mocks(api, monkeypatch):
    import threading
    client, settings, serial = api
    serial._operation_lock = threading.RLock()
    capture = Mock(return_value=capture_fixture())
    move = Mock(return_value={'x': -140, 'y': 175})
    monkeypatch.setattr(host, 'capture_calibration_position', capture)
    monkeypatch.setattr(host, 'checked_position_move', move)
    return client, capture, move


def test_target_checks_reference_before_any_motion(api, monkeypatch):
    client, capture, move = prepare_target_mocks(api, monkeypatch)
    capture.return_value = capture_fixture(epoch=8)
    response = client.post('/api/calibration/target', json=target_request())
    assert response.status_code == 409
    assert 'reference changed' in response.json['error']
    move.assert_not_called()


def test_target_requires_settled_move_and_same_reference_afterward(api, monkeypatch):
    client, capture, move = prepare_target_mocks(api, monkeypatch)
    capture.side_effect = [capture_fixture(), capture_fixture(epoch=8)]
    response = client.post('/api/calibration/target', json=target_request())
    assert response.status_code == 409
    assert not response.json.get('completed')
    assert capture.call_count == 2


def test_target_completion_includes_real_capture_and_conservative_feed(api, monkeypatch):
    client, capture, move = prepare_target_mocks(api, monkeypatch)
    response = client.post('/api/calibration/target', json=target_request())
    assert response.json['completed'] is True
    assert response.json['left_steps'] == -1234
    move.assert_called_once_with({'x': -140, 'y': 175, 'feedrate': 1200}, acceleration=200)
    assert capture.call_count == 2


@pytest.mark.parametrize('bad', [{'x': True}, {'y': '175'}, {'x': float('nan')},
                               {'paths_clear': False}, {'expected_reference': ''}])
def test_target_rejects_invalid_inputs_before_capture_or_move(api, monkeypatch, bad):
    client, capture, move = prepare_target_mocks(api, monkeypatch)
    response = client.post('/api/calibration/target', json={**target_request(), **bad})
    assert response.status_code == 409
    capture.assert_not_called()
    move.assert_not_called()


def test_target_failure_does_not_capture_or_retry(api, monkeypatch):
    client, capture, move = prepare_target_mocks(api, monkeypatch)
    move.side_effect = RuntimeError('Completion unverified')
    response = client.post('/api/calibration/target', json=target_request())
    assert response.status_code == 409
    assert capture.call_count == 1
    assert move.call_count == 1


def test_pending_setup_blocks_guided_target(api, monkeypatch):
    client, capture, move = prepare_target_mocks(api, monkeypatch)
    api[1].set('calibration_pending', {'stage': 'interrupted'})
    assert client.post('/api/calibration/target', json=target_request()).status_code == 409
    capture.assert_not_called()
    move.assert_not_called()


def test_long_move_waits_for_ack_then_completion(api, monkeypatch):
    client, settings, serial = api
    monkeypatch.setattr(host, 'require_completion_protocol', Mock())
    serial.send_streaming.return_value = True
    serial.wait_until_idle.return_value = True
    result = host.checked_position_move({'x': 100, 'y': 100, 'feedrate': 1200}, acceleration=200)
    assert result == {'x': 100, 'y': 100}
    assert serial.send_streaming.call_args.kwargs['timeout'] == 120
    assert serial.send_streaming.call_args.args[0] == 'G0 X100.0000 Y100.0000 F1200.00 A200'
    serial.wait_until_idle.assert_called_once_with(timeout=120)



def test_top_seam_preview_uses_cad_draft_and_explicit_version(api):
    client, settings, serial = api
    before = copy.deepcopy(settings.get_all())
    response = client.post('/api/calibration/preview', json={
        'outside_cover_span_mm':1117.6, 'datum_height_mm':1447.8,
        'datum':'standard-cover-top-seam-v2'})
    assert response.status_code == 200
    assert response.json['datum'] == 'standard-cover-top-seam-v2'
    geometry = response.json['geometry']
    assert geometry['motor_spacing'] == pytest.approx(1058.25970223138)
    assert geometry['anchor_y'] == pytest.approx(694.22985111569)
    assert geometry['reference_x'] == 0 and geometry['reference_y'] == 0
    assert settings.get_all() == before
    assert not serial.mock_calls


@pytest.mark.parametrize('datum', ['unknown', None, [], 2])
def test_unknown_datum_is_rejected(api, datum):
    client, settings, serial = api
    assert client.post('/api/calibration/preview', json={
        'outside_cover_span_mm':1117.6, 'datum_height_mm':1447.8,
        'datum':datum}).status_code == 400
    assert not serial.mock_calls
