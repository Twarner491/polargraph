/** Measured setup and calibration previews. No webhook machine operations. */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const fitFields = {
        motor_spacing: 'fitSpacing', anchor_y: 'fitAnchorY',
        home_belt_left: 'fitHomeLeft', home_belt_right: 'fitHomeRight',
        steps_per_mm_left: 'fitScaleLeft', steps_per_mm_right: 'fitScaleRight'
    };
    let proposal = null;
    let busy = false;
    let polling = null;
    let focusedBeforeModal = null;
    let savedSettings = null;
    let lastStage = 'idle';
    let referenceMeasurements = null;
    let targetReference = null;
    let setupStep = 0;
    let setupUnit = 'mm';
    let accuracyPlan = [];
    let accuracyIndex = 0;
    let accuracyCapture = null;
    let accuracyParkCapture = null;
    let accuracyInitial = null;
    let accuracyBusy = false;
    let accuracyUncertain = false;
    const accuracyMeasurements = [];
    const accuracyStorageKey = 'polargraph.accuracyDraft.v1';


    function isRelay() {
        const app = window.plotterApp;
        return Boolean((app && (app.webhookUrl || app.usingWebhook)) ||
            (typeof POLARGRAPH_WEBHOOK_URL !== 'undefined' && POLARGRAPH_WEBHOOK_URL) ||
            (typeof CLIENT_SIDE_MODE !== 'undefined' && CLIENT_SIDE_MODE));
    }

    async function api(path, body, timeout = 20000) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(path, {
                method: body === undefined ? 'GET' : 'POST',
                headers: {'Content-Type': 'application/json'},
                body: body === undefined ? undefined : JSON.stringify(body),
                cache: 'no-store', signal: controller.signal
            });
            const data = await response.json();
            if (!response.ok || data.success === false || (data.error && !data.stage)) {
                throw new Error(data.error || `Request failed (${response.status}).`);
            }
            return data;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('The local controller did not reply in time. Check its status before repeating a machine action.');
            }
            if (error instanceof SyntaxError) {
                throw new Error('The calibration API is unavailable here. Open the updated local plotter interface.');
            }
            throw error;
        } finally {
            clearTimeout(timer);
        }
    }

    function report(id, message, error = false) {
        $(id).textContent = message;
        $(id).dataset.error = String(error);
    }

    function number(id, label) {
        const raw = $(id).value.trim();
        const value = Number(raw);
        if (!raw || !Number.isFinite(value)) throw new Error(`Enter ${label}.`);
        return value;
    }

    function measurements() {
        return {
            datum: 'standard-cover-top-seam-v2',
            outside_cover_span_mm: number('setupSpan', 'the measured outside span') * (setupUnit === 'in' ? 25.4 : 1),
            datum_height_mm: number('setupHeight', 'the measured datum height') * (setupUnit === 'in' ? 25.4 : 1)
        };
    }

    function setBusy(value) {
        busy = value;
        ['setupSpan', 'setupHeight', 'setupUnits', 'setupBack', 'setupPreview', 'setupStandard', 'setupAligned', 'setupClear'].forEach(id => {
            $(id).disabled = value;
        });
        updateButtons();
    }

    function updateButtons() {
        $('setupReference').disabled = busy || lastStage === 'confirm_reference' || !proposal || isRelay() ||
            !$('setupStandard').checked || !$('setupAligned').checked || !$('setupClear').checked;
        $('setupBack').disabled = busy || lastStage === 'confirm_reference';
        $('setupUnits').disabled = busy || lastStage === 'confirm_reference';
        $('setupFinish').disabled = busy || lastStage !== 'confirm_reference' || isRelay() || !$('setupReturned').checked;
    }

    function showModal(id) {
        focusedBeforeModal = document.activeElement;
        $(id).style.display = 'flex';
        $(id).querySelector('button').focus();
    }

    function hideModal(id) {
        $(id).style.display = 'none';
        // Clear a deep link so following it again reopens the dialog.
        if (location.hash === '#setup' || location.hash === '#accuracy') window.history.replaceState(null, '', location.pathname + location.search);
        if (focusedBeforeModal && focusedBeforeModal.isConnected) focusedBeforeModal.focus();
    }

    function installDialog(id) {
        $(id).addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                hideModal(id);
                return;
            }
            if (event.key !== 'Tab') return;
            const controls = [...$(id).querySelectorAll('button, input, select, summary, [tabindex="0"]')]
                .filter(el => !el.disabled && el.getClientRects().length);
            if (!controls.length) return;
            if (event.shiftKey && document.activeElement === controls[0]) {
                event.preventDefault(); controls[controls.length - 1].focus();
            } else if (!event.shiftKey && document.activeElement === controls[controls.length - 1]) {
                event.preventDefault(); controls[0].focus();
            }
        });
    }

    async function requireLocalConnection() {
        if (isRelay()) throw new Error('A verified local connection is needed. Open http://plotter.local/ on the machine’s network; the webhook cannot verify these steps.');
        const status = await api('/api/connection_status');
        if (status.connected !== true) throw new Error('Connect to the controller through the local interface, then return to this step.');
    }

    async function preview() {
        $('setupPreview').disabled = true;
        try {
            const measured = measurements();
            const response = await api('/api/calibration/preview', measured);
            const result = response.preview || response;
            if (!result.geometry) throw new Error('The preview did not return measured geometry.');
            if (JSON.stringify(measurements()) !== JSON.stringify(measured)) return;
            proposal = {measurements: measured, geometry: result.geometry};
            report('setupPreviewResult', '');
            setSetupStep(2);

        } catch (error) {
            proposal = null;
            report('setupPreviewResult', error.message, true);
        } finally {
            $('setupPreview').disabled = busy;
            updateButtons();
        }
    }

    function setSetupStep(step) {
        setupStep = step;
        document.querySelectorAll('[data-setup-step]').forEach(el => { el.hidden = Number(el.dataset.setupStep) !== step; });
        $('setupStepName').textContent = ['Width', 'Height', 'Center mark', 'Home and return'][step];
        $('setupStepCount').textContent = `${step + 1} of 4`;
        $('setupBack').hidden = step === 0;
        $('setupPreview').hidden = step === 3;
        const heading = document.querySelector(`[data-setup-step="${step}"] h4`);
        heading.focus({preventScroll: true});
        $('setupWizardModal').querySelector('.modal-body').scrollTop = 0;
        updateButtons();
    }

    async function nextSetupStep() {
        try {
            if (setupStep === 0) {
                const width = number('setupSpan', 'the measured width') * (setupUnit === 'in' ? 25.4 : 1);
                if (width < 100 + 2 * 29.67014888431 || width > 10000) throw new Error('Check the width and selected units. The motor spacing must be at least 100 mm.');
                if (!$('setupStandard').checked) throw new Error('This setup uses the published, unscaled covers. Confirm they are seated and level.');
                report('setupPreviewResult', ''); setSetupStep(1);
            } else if (setupStep === 1) await preview();
            else if (setupStep === 2) {
                if (!$('setupAligned').checked) throw new Error('Place the pen axis on your mark and confirm before continuing.');
                report('setupPreviewResult', ''); setSetupStep(3);
            }
        } catch (error) { report('setupPreviewResult', error.message, true); }
    }

    const stageText = {
        idle: '',
        checking: 'Checking the controller.',
        homing: 'Homing. Watch both counterweights.',
        applying: 'Writing the geometry to the controller.',
        returning: 'Returning to your mark.',
        confirm_reference: 'Check that the pen hole is back on the mark.',
        saved: 'Saved. Edge accuracy is not measured yet.',
        interrupted: 'Setup was interrupted. Set the pen hole on the mark and start again.',
        saving: 'Saving.',
        failed: 'Setup stopped. Nothing was saved.'
    };

    function renderStatus(data) {
        const status = data.state || (typeof data.status === 'object' ? data.status : data);
        lastStage = status.stage || 'idle';
        setBusy(Boolean(status.running));
        if (status.running || lastStage === 'confirm_reference') setSetupStep(3);
        $('setupToAccuracy').hidden = lastStage !== 'saved';
        $('setupReturnSection').hidden = lastStage !== 'confirm_reference';
        if (lastStage !== 'confirm_reference') $('setupReturned').checked = false;
        report('setupStatus', status.error || (lastStage in stageText ? stageText[lastStage] : `Controller stage: ${lastStage}`), Boolean(status.error));
        updateButtons();
        return status;
    }

    async function pollStatus() {
        clearTimeout(polling);
        try {
            if (isRelay()) throw new Error('Connection changed to a relay. Reopen the local interface to verify the running setup.');
            const status = renderStatus(await api('/api/calibration/status'));
            if (status.running) polling = setTimeout(pollStatus, 1000);
        } catch (error) {
            // Do not release the controls or imply the machine stopped on loss.
            report('setupStatus', `Status is unverified: ${error.message}\nClosing this window does not stop motion. Reopen the local interface to check.`, true);
        }
    }

    async function startReference() {
        if (busy || !proposal) return;
        if (!$('setupStandard').checked || !$('setupAligned').checked || !$('setupClear').checked) return;
        setBusy(true);
        $('setupReturned').checked = false;
        $('setupReturnSection').hidden = true;
        try {
            await requireLocalConnection();
            const measured = measurements();
            if (JSON.stringify(measured) !== JSON.stringify(proposal.measurements)) {
                throw new Error('The measurements changed. Preview the geometry again before moving.');
            }
            referenceMeasurements = measured;
            await api('/api/calibration/reference', {
                ...measured, reference_aligned: true, paths_clear: true
            });
            report('setupStatus', 'Reference capture requested. Waiting for the controller’s verified status.');
            await pollStatus();
        } catch (error) {
            report('setupStatus', error.message, true);
            // A lost POST response may still mean the operation started. Recover
            // state with a GET, never retry the motion request automatically.
            if (!isRelay()) {
                try { renderStatus(await api('/api/calibration/status')); }
                catch (_) { report('setupStatus', `${error.message}\nMachine status is unknown; check the local controller before repeating.`, true); }
            } else setBusy(false);
        }
    }

    async function finishReference() {
        if (busy || lastStage !== 'confirm_reference' || !$('setupReturned').checked) return;
        setBusy(true);
        try {
            await requireLocalConnection();
            await api('/api/calibration/finish', {returned_to_mark: true});
            await pollStatus();
            savedSettings = null;
            if (typeof loadSettings === 'function') await loadSettings();
        } catch (error) {
            setBusy(false);
            report('setupStatus', error.message, true);
        }
    }

    async function openSetup() {
        showModal('setupWizardModal');
        $('setupConnectionNote').hidden = !isRelay();
        $('setupConnectionNote').textContent = 'Homing needs the local interface at plotter.local.';
        if (!isRelay()) await pollStatus();
        updateButtons();
    }

    function addTarget(group = 'fit') {
        const row = document.createElement('tr');
        const names = ['x', 'y', 'left_steps', 'right_steps'];
        const labels = ['Measured X in mm', 'Measured Y in mm', 'Actual signed left steps', 'Actual signed right steps'];
        names.forEach((name, i) => {
            const cell = row.insertCell();
            const input = document.createElement('input');
            input.type = 'number'; input.step = i > 1 ? '1' : 'any'; input.className = 'input-num';
            input.name = name; input.setAttribute('aria-label', labels[i]);
            cell.append(input);
        });
        const select = document.createElement('select');
        select.className = 'input-select';
        select.setAttribute('aria-label', 'Target use');
        [['fit', 'Fit'], ['validation', 'Validate']].forEach(([value, text]) => {
            const option = document.createElement('option'); option.value = value; option.textContent = text;
            select.append(option);
        });
        select.value = group;
        row.insertCell().append(select);
        const remove = document.createElement('button');
        remove.className = 'btn row-remove'; remove.type = 'button'; remove.textContent = '×';
        remove.setAttribute('aria-label', 'Remove measured target');
        remove.addEventListener('click', () => { row.remove(); invalidateFit(); });
        const controls = row.insertCell();
        const capture = document.createElement('button');
        capture.className = 'btn row-capture'; capture.type = 'button'; capture.textContent = 'Capture';
        capture.title = 'Read settled motor pulses at the current position; this does not move the machine.';
        capture.addEventListener('click', async () => {
            capture.disabled = true;
            try {
                await requireLocalConnection();
                const result = await api('/api/calibration/capture', {});
                const reference = `${result.session_id}:${result.connection_id}:${result.reference_epoch}`;
                if (targetReference && targetReference !== reference) {
                    throw new Error('The motor reference changed. Clear all targets and collect a fresh set without homing or resetting coordinates between targets.');
                }
                targetReference = reference;
                row.querySelector('input[name="left_steps"]').value = result.left_steps;
                row.querySelector('input[name="right_steps"]').value = result.right_steps;
                row.dataset.reference = reference;
                report('advancedResult', 'Motor pulses captured. Measure the physical pen axis from the center mark and enter X and Y for this row.');
            } catch (error) { report('advancedResult', error.message, true); }
            finally { capture.disabled = false; }
        });
        controls.append(capture, remove);
        $('advancedTargets').append(row);
        invalidateFit();
        return row;
    }

    async function loadProfile() {
        try {
            if (isRelay()) throw new Error('Open the local interface to read the saved controller profile. You can enter a measured profile here manually.');
            const response = await api('/api/settings');
            const settings = response.settings || response;
            const p = settings.calibration_profile;
            if (!p || !p.geometry || !p.reference_verified) throw new Error('No verified measured setup profile is saved yet. Complete Setup wizard first, or enter independently measured starting geometry.');
            const verified = p.persisted_controller_readback || p.controller_readback;
            const previous = verified && verified.steps;
            const values = {
                motor_spacing: settings.motor_spacing, anchor_y: settings.motor_y,
                home_belt_left: settings.home_belt_left, home_belt_right: settings.home_belt_right,
                steps_per_mm_left: previous && previous[0], steps_per_mm_right: previous && previous[1]
            };
            savedSettings = settings;
            Object.entries(fitFields).forEach(([key, id]) => { $(id).value = Number.isFinite(values[key]) ? values[key] : ''; });
            report('advancedResult', 'Loaded the saved reference. Supply independent measurements before fitting.');
            return values;
        } catch (error) { report('advancedResult', error.message, true); return null; }
    }

    function renderFit(result) {
        if (!result.candidate || !result.training || !result.validation) throw new Error('The API did not return a calibration candidate.');
        const metric = value => Number.isFinite(value) ? `${value.toFixed(1)} mm` : 'not measured';
        const baselineChecks = result.baseline.samples.filter(sample =>
            result.validation.samples.some(check => check.x === sample.x && check.y === sample.y));
        const baselineCheckRms = baselineChecks.length ? Math.sqrt(baselineChecks.reduce((sum, sample) => sum + sample.error_mm ** 2, 0) / baselineChecks.length) : null;
        const baselineCheckMax = baselineChecks.length ? Math.max(...baselineChecks.map(sample => sample.error_mm)) : null;
        const checksWorsened = baselineChecks.length > 0 && result.validation.rms_mm > baselineCheckRms + 1e-6;
        const verdict = result.accepted === true ? 'Candidate passes the supplied measurement checks.' : 'Candidate does not pass the measurement checks.';
        report('advancedResult', `${verdict}\nAll measured points, current RMS / maximum: ${metric(result.baseline.rms_mm)} / ${metric(result.baseline.max_mm)}\nFitting points, candidate RMS / maximum: ${metric(result.training.rms_mm)} / ${metric(result.training.max_mm)}\nIndependent checks, current RMS / maximum: ${metric(baselineCheckRms)} / ${metric(baselineCheckMax)}\nIndependent checks, candidate RMS / maximum: ${metric(result.validation.rms_mm)} / ${metric(result.validation.max_mm)}\n${checksWorsened ? 'The independent checks got worse. Keep the saved geometry.\n' : ''}${(result.reasons || []).join('\n')}${result.reasons && result.reasons.length ? '\n' : ''}Remeasure uncertain marks before fitting. Preview only. Nothing has been installed. Accuracy outside the measured region is unverified.`, result.accepted !== true || checksWorsened);
        $('advancedCandidateDetails').hidden = false;
        $('advancedCandidate').textContent = JSON.stringify(result, null, 2);
        const table = document.createElement('table'); table.className = 'calibration-table';
        const head = table.createTHead().insertRow();
        ['Use', 'X (mm)', 'Y (mm)', 'ΔX (mm)', 'ΔY (mm)', 'Error (mm)'].forEach(text => {
            const cell = document.createElement('th'); cell.scope = 'col'; cell.textContent = text; head.append(cell);
        });
        const body = table.createTBody();
        [['Fit', result.training], ['Validate', result.validation]].forEach(([label, group]) => {
            (group.samples || []).forEach(sample => {
                const row = body.insertRow();
                [label, sample.x, sample.y, sample.dx_mm, sample.dy_mm, sample.error_mm].forEach(value => {
                    row.insertCell().textContent = typeof value === 'number' ? value.toFixed(3) : value;
                });
            });
        });
        $('advancedResiduals').replaceChildren(table);
    }

    async function fit() {
        $('advancedFit').disabled = true;
        $('advancedCandidateDetails').hidden = true;
        $('advancedResiduals').replaceChildren();
        try {
            if (!$('advancedIndependent').checked) throw new Error('Confirm that the data are independent physical measurements and actual recorded motor steps.');
            const initial = {};
            Object.entries(fitFields).forEach(([key, id]) => { initial[key] = number(id, key.replaceAll('_', ' ')); });
            const samples = [], validation_samples = [];
            [...$('advancedTargets').rows].forEach((row, i) => {
                const sample = {};
                row.querySelectorAll('input').forEach(input => {
                    const value = Number(input.value);
                    if (!input.value.trim() || !Number.isFinite(value)) throw new Error(`Complete measured target ${i + 1}, or remove its row.`);
                    if (input.name.includes('steps') && !Number.isInteger(value)) throw new Error(`Target ${i + 1} step counts must be whole numbers.`);
                    sample[input.name] = value;
                });
                (row.querySelector('select').value === 'fit' ? samples : validation_samples).push(sample);
            });
            const fit_parameters = [...document.querySelectorAll('input[name="fitParameter"]:checked')].map(input => input.value);
            const data = await api('/api/calibration/fit', {samples, initial, fit_parameters, validation_samples});
            renderFit(data.result || data.fit || data);
        } catch (error) { report('advancedResult', error.message, true); }
        finally { $('advancedFit').disabled = false; }
    }

    function invalidateFit() {
        $('advancedCandidateDetails').hidden = true;
        $('advancedResiduals').replaceChildren();
        report('advancedResult', '');
    }

    function accuracyDocument() {
        return {schema_version:1, measured_at:new Date().toISOString(), initial:accuracyInitial, reference:targetReference, measurements:accuracyMeasurements, candidate_applied:false};
    }

    function saveAccuracyDraft() {
        try { localStorage.setItem(accuracyStorageKey, JSON.stringify(accuracyDocument())); }
        catch (_) { report('accuracySummary', 'Browser storage is unavailable. Download the measurements before closing this page.', true); }
    }

    function openAdvanced() {
        showModal('advancedCalibrationModal');
        if (accuracyPlan.length || accuracyMeasurements.length) return;
        try {
            const raw = localStorage.getItem(accuracyStorageKey);
            if (!raw) return;
            const draft = JSON.parse(raw);
            if (draft.schema_version !== 1 || !draft.initial || !Array.isArray(draft.measurements) || !draft.measurements.length) return;
            if (draft.measurements.length > 8 || draft.measurements.some(m => !['x','y','left_steps','right_steps'].every(k => Number.isFinite(m[k])) || !['fit','validation'].includes(m.group))) throw new Error('Invalid saved measurement data.');
            accuracyInitial = draft.initial; targetReference = draft.reference;
            accuracyMeasurements.push(...draft.measurements);
            Object.entries(fitFields).forEach(([key,id]) => { $(id).value = accuracyInitial[key]; });
            $('advancedTargets').replaceChildren();
            for (const m of accuracyMeasurements) {
                const row = addTarget(m.group);
                for (const k of ['x','y','left_steps','right_steps']) row.querySelector(`input[name="${k}"]`).value = m[k];
            }
            $('accuracyExport').disabled = false;
            report('accuracySummary', `Recovered ${accuracyMeasurements.length} recorded measurements for review or download. To collect a fresh set, clear targets in Manual targets and fit settings. Motion does not resume automatically.`);
        } catch (error) { report('accuracySummary', `Could not restore the measurement draft: ${error.message}`, true); }
    }

    function resetAccuracy() {
        accuracyPlan = []; accuracyIndex = 0; accuracyCapture = null; accuracyParkCapture = null;
        accuracyMeasurements.length = 0; accuracyInitial = null;
        $('accuracyTarget').hidden = true;
        $('accuracyExport').disabled = true;
        $('advancedIndependent').checked = false;
        report('accuracySummary', '');
        invalidateFit();
        try { localStorage.removeItem(accuracyStorageKey); } catch (_) { /* Export remains available without storage. */ }
    }

    function setAccuracyBusy(value) {
        accuracyBusy = value;
        ['accuracyPrepare', 'advancedClearTargets', 'advancedLoadProfile', 'advancedAddTarget', 'advancedFit'].forEach(id => { $(id).disabled = value || accuracyUncertain; });
        $('accuracyMove').disabled = value || accuracyUncertain || Boolean(accuracyCapture);
        $('accuracyMoveAside').disabled = value || accuracyUncertain || !accuracyCapture || Boolean(accuracyParkCapture);
        $('accuracyRecord').disabled = value || accuracyUncertain || !accuracyCapture;
    }

    function referenceKey(result) {
        return `${result.session_id}:${result.connection_id}:${result.reference_epoch}`;
    }

    function showAccuracyPoint() {
        accuracyCapture = null; accuracyParkCapture = null;
        $('accuracyX').value = ''; $('accuracyY').value = '';
        const point = accuracyPlan[accuracyIndex];
        if (!point) {
            $('accuracyTarget').hidden = true;
            report('accuracySummary', `${$('accuracySummary').textContent} All eight points are recorded. Confirm the data below, then compare accuracy and fit. The machine stays at the last point.`);
            setAccuracyBusy(false);
            return;
        }
        $('accuracyTarget').hidden = false;
        document.querySelectorAll('[data-point]').forEach(el => el.classList.toggle('active', Number(el.dataset.point) === accuracyIndex));
        $('accuracyProgress').textContent = `${point.label}, ${accuracyIndex + 1} of ${accuracyPlan.length}. Target X ${point.x} mm, Y ${point.y} mm.`;
        report('accuracyMoveStatus', '');
        setAccuracyBusy(false);
    }

    async function prepareAccuracy() {
        if (accuracyBusy || accuracyUncertain) return;
        if (accuracyMeasurements.length) {
            report('accuracySummary', 'Download your measurements, then clear targets in Manual targets and fit settings to start a new set.');
            return;
        }
        setAccuracyBusy(true);
        try {
            if (!$('accuracyClear').checked) throw new Error('Confirm the home return and clear paths before preparing points.');
            await requireLocalConnection();
            const initial = await loadProfile();
            if (!initial) throw new Error('Complete Setup wizard before measuring accuracy.');
            const reference = await api('/api/calibration/capture', {});
            const b = savedSettings.work_area;
            // Settings expose bounds through named fields, not a paper rectangle.
            const bounds = b || {left: savedSettings.limit_left, right: savedSettings.limit_right, bottom: savedSettings.limit_bottom, top: savedSettings.limit_top};
            if (!Object.values(bounds).every(Number.isFinite) || !(bounds.left < 0 && bounds.right > 0 && bounds.bottom < 0 && bounds.top > 0)) throw new Error('The saved drawing bounds must contain the center mark.');
            const l = Math.round(bounds.left * .65), r = Math.round(bounds.right * .65);
            const t = Math.round(bounds.top * .65), d = Math.round(bounds.bottom * .65);
            if (r - l < 40 || t - d < 40) throw new Error('The drawing area is too small for spread-out measurements.');
            resetAccuracy();
            accuracyInitial = initial;
            targetReference = referenceKey(reference);
            accuracyPlan = [
                {x:l,y:t,label:'Upper left',group:'fit'}, {x:0,y:t,label:'Upper middle',group:'fit'},
                {x:r,y:t,label:'Upper right',group:'fit'}, {x:r,y:0,label:'Right middle',group:'validation'},
                {x:r,y:d,label:'Lower right',group:'fit'}, {x:0,y:d,label:'Lower middle',group:'fit'},
                {x:l,y:d,label:'Lower left',group:'fit'}, {x:l,y:0,label:'Left middle',group:'validation'}
            ];
            $('advancedTargets').replaceChildren();
            report('accuracySummary', `Prepared an inner ${r-l} × ${t-d} mm measurement region. Check its clearance as each move runs.`);
            showAccuracyPoint();
        } catch (error) { report('accuracySummary', error.message, true); }
        finally { setAccuracyBusy(false); }
    }

    async function moveAccuracy() {
        if (accuracyBusy || accuracyUncertain || accuracyCapture || !accuracyPlan[accuracyIndex]) return;
        setAccuracyBusy(true);
        let dispatched = false;
        try {
            if (!$('accuracyClear').checked) throw new Error('Confirm clear paths and stay by the machine.');
            await requireLocalConnection();
            const point = accuracyPlan[accuracyIndex];
            report('accuracyMoveStatus', 'Moving slowly. Wait for confirmed completion before measuring.');
            dispatched = true;
            const result = await api('/api/calibration/target', {x:point.x, y:point.y, expected_reference:targetReference, paths_clear:true}, 300000);
            if (referenceKey(result) !== targetReference || result.completed !== true) throw new Error('The controller reference or completion is unverified.');
            accuracyCapture = result;
            report('accuracyMoveStatus', 'Mark the center of the pen hole, then move aside to make room for the tape.');
            $('accuracyX').focus();
        } catch (error) {
            // A lost response must never offer a second blind motion request.
            accuracyUncertain = dispatched;
            report('accuracyMoveStatus', `${error.message}${dispatched ? ' This set is stopped. Download any recorded data, check the machine, then reload and start a fresh set.' : ''}`, true);
        } finally { setAccuracyBusy(false); }
    }

    async function moveAccuracyAside() {
        if (accuracyBusy || accuracyUncertain || !accuracyCapture || accuracyParkCapture) return;
        setAccuracyBusy(true);
        let dispatched = false;
        try {
            if (!$('accuracyClear').checked) throw new Error('Stay by the machine and check the path before moving aside.');
            const check = await api('/api/calibration/capture', {});
            if (referenceKey(check) !== targetReference || check.left_steps !== accuracyCapture.left_steps || check.right_steps !== accuracyCapture.right_steps) {
                accuracyUncertain = true;
                throw new Error('The position changed before marking was confirmed. Start a fresh measurement set.');
            }
            const point = accuracyPlan[accuracyIndex];
            const response = await api('/api/settings');
            const settings = response.settings || response;
            const candidates = point.x === 0 ? [-60, 60] : [point.x + (point.x > 0 ? 60 : -60)];
            const x = candidates.find(value => value >= settings.limit_left && value <= settings.limit_right);
            if (x === undefined) throw new Error('There is not enough room to move outward from this mark. Measure this point in place.');
            report('accuracyMoveStatus', `Moving 60 mm ${x < point.x ? 'left' : 'right'} to clear your mark.`);
            dispatched = true;
            const parked = await api('/api/calibration/target', {x, y:point.y, expected_reference:targetReference, paths_clear:true}, 300000);
            if (referenceKey(parked) !== targetReference || parked.completed !== true) throw new Error('The move-aside completion or reference is unverified.');
            // Keep the marked point's capture untouched. Parking is only access
            // for the tape; it is never substituted into the calibration fit.
            accuracyParkCapture = parked;
            report('accuracyMoveStatus', 'The mark is clear. Measure from your center mark to the mark you just made, and enter X and Y.');
            $('accuracyX').focus();
        } catch (error) {
            accuracyUncertain = accuracyUncertain || dispatched;
            report('accuracyMoveStatus', `${error.message}${accuracyUncertain ? ' This set is stopped; check the machine before starting a fresh set.' : ''}`, true);
        } finally { setAccuracyBusy(false); }
    }

    async function recordAccuracy() {
        if (accuracyBusy || accuracyUncertain || !accuracyCapture) return;
        setAccuracyBusy(true);
        try {
            const sample = {x:number('accuracyX', 'measured X in mm'), y:number('accuracyY', 'measured Y in mm'), left_steps:accuracyCapture.left_steps, right_steps:accuracyCapture.right_steps};
            if (Math.abs(sample.x) > 10000 || Math.abs(sample.y) > 10000) throw new Error('Check the measurements and units; enter millimeters.');
            const check = await api('/api/calibration/capture', {});
            const expectedPosition = accuracyParkCapture || accuracyCapture;
            if (referenceKey(check) !== targetReference || check.left_steps !== expectedPosition.left_steps || check.right_steps !== expectedPosition.right_steps) {
                accuracyUncertain = true;
                throw new Error('The controller moved or its reference changed after this target. Download recorded data and start a fresh set.');
            }
            const point = accuracyPlan[accuracyIndex];
            const error = Math.hypot(sample.x-point.x,sample.y-point.y);
            accuracyMeasurements.push({...sample, group:point.group, target:{x:point.x,y:point.y}, capture:accuracyCapture, parking_capture:accuracyParkCapture});
            const row = addTarget(point.group);
            for (const [key,value] of Object.entries(sample)) row.querySelector(`input[name="${key}"]`).value = value;
            row.dataset.reference = targetReference;
            $('accuracyExport').disabled = false;
            const rms = Math.sqrt(accuracyMeasurements.reduce((sum,m) => sum+(m.x-m.target.x)**2+(m.y-m.target.y)**2,0)/accuracyMeasurements.length);
            report('accuracySummary', `Point ${accuracyIndex+1}: ${error.toFixed(2)} mm from its command. Measured RMS so far: ${rms.toFixed(2)} mm. ${accuracyMeasurements.length}/8 recorded.`);
            accuracyIndex++;
            showAccuracyPoint();
            saveAccuracyDraft();
        } catch (error) { report('accuracyMoveStatus', error.message, true); }
        finally { setAccuracyBusy(false); }
    }

    function exportAccuracy() {
        const data = accuracyDocument();
        const url = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)], {type:'application/json'}));
        const link = document.createElement('a');link.href=url;link.download='polargraph-accuracy-measurements.json';link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    async function welcomeIfNeeded() {
        if (isRelay()) return;
        try {
            const response = await api('/api/settings');
            savedSettings = response.settings || response;
            if (savedSettings.calibrated !== false || savedSettings.calibration_pending) return;
            if (sessionStorage.getItem('polargraph.measuredSetupWelcome') === 'seen') return;
            // Offer once per browser session, only when the user has not already
            // opened another modal. Disconnection never triggers machine work.
            if ([...document.querySelectorAll('.modal')].some(el => getComputedStyle(el).display !== 'none')) return;
            sessionStorage.setItem('polargraph.measuredSetupWelcome', 'seen');
            await openSetup();
        } catch (_) { /* Offline page remains usable; opening the menu shows errors. */ }
    }

    // Guide drawings are inlined so the interface can write real dimensions into them.
    async function loadGuides() {
        await Promise.all([...document.querySelectorAll('[data-guide]')].map(async el => {
            try {
                const response = await fetch(`/static/calibration/guide-${el.dataset.guide}.svg?v=5`);
                if (response.ok) el.innerHTML = await response.text();
            } catch (_) { /* The steps still work without a drawing. */ }
        }));
        updateGuideDims();
    }

    function updateGuideDims() {
        const unit = setupUnit === 'in' ? 'in' : 'mm';
        const read = id => { const v = Number($(id).value); return $(id).value.trim() && v > 0 ? v : null; };
        const fmt = v => `${v.toLocaleString(undefined, {maximumFractionDigits: 2})} ${unit}`;
        const w = read('setupSpan'), h = read('setupHeight');
        const set = (dim, text) => document.querySelectorAll(`[data-dim="${dim}"]`).forEach(el => { el.textContent = text; });
        set('w', w ? fmt(w) : 'W'); set('w2', w ? fmt(w / 2) : 'W ÷ 2');
        set('h', h ? fmt(h) : 'H'); set('h2', h ? fmt(h / 2) : 'H ÷ 2');
    }

    function init() {
        if (!$('setupWizardModal') || !$('advancedCalibrationModal')) return;
        // Permit an interface update while the server retains a live motor
        // reference and an older template is still in its template cache.
        if (!$('accuracyMoveAside')) {
            const aside = document.createElement('button');
            aside.id = 'accuracyMoveAside'; aside.className = 'btn full';
            aside.type = 'button'; aside.disabled = true;
            aside.textContent = 'Marked, move aside';
            $('accuracyMove').insertAdjacentElement('afterend', aside);
        }
        $('openSetupWizard').disabled = false;
        $('startCalibration').disabled = false;
        $('openSetupWizard').addEventListener('click', openSetup);
        $('startCalibration').addEventListener('click', openAdvanced);
        $('setupToAccuracy').addEventListener('click', () => { hideModal('setupWizardModal'); openAdvanced(); });
        $('setupMeasuredClose').addEventListener('click', () => hideModal('setupWizardModal'));
        $('advancedCalibrationClose').addEventListener('click', () => hideModal('advancedCalibrationModal'));
        installDialog('setupWizardModal'); installDialog('advancedCalibrationModal');
        $('setupPreview').addEventListener('click', nextSetupStep);
        $('setupBack').addEventListener('click', () => { report('setupPreviewResult', ''); setSetupStep(Math.max(0, setupStep - 1)); });
        $('setupUnits').addEventListener('change', () => {
            const next = $('setupUnits').value;
            const factor = next === 'in' ? 1 / 25.4 : 25.4;
            ['setupSpan', 'setupHeight'].forEach(id => {
                if ($(id).value.trim()) $(id).value = String(Number(($(id).value * factor).toFixed(6)));
            });
            setupUnit = next;
            updateGuideDims();
            proposal = null; $('setupAligned').checked = false;
            setSetupStep(Math.min(setupStep, 1));
        });
        $('setupReference').addEventListener('click', startReference);
        $('setupFinish').addEventListener('click', finishReference);
        ['setupStandard', 'setupAligned', 'setupClear', 'setupReturned'].forEach(id => $(id).addEventListener('change', updateButtons));
        ['setupSpan', 'setupHeight'].forEach(id => $(id).addEventListener('input', () => {
            updateGuideDims();
            const hadPreview = proposal !== null;
            proposal = null; $('setupAligned').checked = false; $('setupReturned').checked = false;
            report('setupPreviewResult', hadPreview ? 'Measurements changed. Preview again, then check the physical midpoint.' : '');
            updateButtons();
        }));
        $('advancedLoadProfile').addEventListener('click', loadProfile);
        $('advancedAddTarget').addEventListener('click', () => addTarget());
        $('advancedClearTargets').addEventListener('click', () => {
            if (accuracyBusy || accuracyUncertain) return;
            resetAccuracy();
            $('advancedTargets').replaceChildren(); targetReference = null;
            for (let i = 0; i < 6; i++) addTarget(i < 4 ? 'fit' : 'validation');
        });
        $('advancedFit').addEventListener('click', fit);
        $('advancedManual').addEventListener('input', invalidateFit);
        $('advancedManual').addEventListener('change', invalidateFit);
        $('accuracyPrepare').addEventListener('click', prepareAccuracy);
        $('accuracyMove').addEventListener('click', moveAccuracy);
        $('accuracyRecord').addEventListener('click', recordAccuracy);
        $('accuracyMoveAside').addEventListener('click', moveAccuracyAside);
        $('accuracyExport').addEventListener('click', exportAccuracy);
        for (let i = 0; i < 6; i++) addTarget(i < 4 ? 'fit' : 'validation');
        loadGuides();
        window.addEventListener('hashchange', openFromHash);
        if (!openFromHash()) welcomeIfNeeded();
    }

    // Deep links: #setup opens the Setup wizard, #accuracy opens Advanced calibration.
    function openFromHash() {
        const target = location.hash.slice(1);
        if (target !== 'setup' && target !== 'accuracy') return false;
        document.querySelectorAll('.modal').forEach(el => { el.style.display = 'none'; });
        if (target === 'setup') openSetup(); else openAdvanced();
        return true;
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
