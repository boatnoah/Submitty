/* exported addToTable, deleteRow */
const benchmarks_with_input_fields = ['lowest_a-', 'lowest_b-', 'lowest_c-', 'lowest_d'];

// eslint-disable-next-line no-unused-vars
function ExtractBuckets() {
    const x = [];
    const bucket_list = $('#buckets_used_list').find('li');
    bucket_list.each((idx, li) => {
        x.push($(li).text());
    });

    $('#generate_json').val(JSON.stringify(x));
    $('#custom_form').submit();
}

// Forces element's value to be non-negative
// eslint-disable-next-line no-unused-vars
function ClampPoints(el) {
    if (el.value === '') {
        el.value = el.placeholder;
        el.classList.remove('override');
    }
    el.value = Math.max(0.0, el.value);
}

// eslint-disable-next-line no-unused-vars
function DetectMaxOverride(el) {
    if (el.value !== el.placeholder) {
        el.classList.add('override');
    }
    else {
        el.classList.remove('override');
    }
}

function ExtractBucketName(s, offset) {
    const tmp = s.split('-');
    let bucket = '';
    let i;
    for (i = offset; i < tmp.length; i++) {
        if (i > offset) {
            bucket += '-';
        }
        bucket += tmp[i];
    }
    return bucket;
}

// Forces element's value to be in range [0.0,100.0]
// eslint-disable-next-line no-unused-vars
function ClampPercent(el) {
    el.value = Math.min(Math.max(el.value, 0.0), 100.0);
    UpdateUsedPercentage();
    $(`#config-percent-${ExtractBucketName(el.id, 1)}`).text(`${el.value}%`);
}

// Updates the sum of percentage points accounted for by the buckets being used
function UpdateUsedPercentage() {
    let val = 0.0;
    $("input[id^='percent']").filter(function () {
        return $(this).parent().css('display') !== 'none';
    }).each(function () {
        val += parseFloat($(this).val());
    });
    const percentage_span = $('#used_percentage');
    percentage_span.text(`${val.toString()}%`);
    if (val > 100.0) {
        percentage_span.css({ 'color': 'red', 'font-weight': 'bold' });
    }
    else {
        percentage_span.css({ 'color': 'var(--text-black)', 'font-weight': '' });
    }
}

// Updates which buckets have full configuration shown (inc. each gradeable), and the ordering
// eslint-disable-next-line no-unused-vars
function UpdateVisibilityBuckets() {
    // For each bucket that isn't being used, hide it
    $('#buckets_available_list').find('input').each(function () {
        // Extract the bucket name
        const bucket = ExtractBucketName($(this).attr('id'), 1);
        $(`#config-${bucket}`).css('display', 'none');
    });

    // For each bucket that IS being used, show it
    const used_buckets = $('#buckets_used_list').find('input');
    if (used_buckets.length === 0) {
        return;
    }
    let prev_bucket = ExtractBucketName(used_buckets.first().attr('id'), 1);
    $(`#config-${prev_bucket}`).prependTo('#config-wrapper').css('display', 'block');

    used_buckets.each(function () {
        // Extract the bucket name
        const bucket = ExtractBucketName($(this).attr('id'), 1);
        console.log(`prev_bucket: ${prev_bucket} bucket: ${bucket}`);
        if (bucket !== prev_bucket) {
            $(`#config-${bucket}`).css('display', 'block');
            $(`#config-${prev_bucket}`).after($(`#config-${bucket}`));
            prev_bucket = bucket;
        }
    });
}

function getDisplay() {
    // Collect display
    const display = [];

    $.each($("input[name='display']:checked"), function () {
        display.push($(this).val());
    });

    return display;
}

function getSection() {
    // Collect sections and labels
    const sections = {};

    $.each($("input[class='sections_and_labels']"), function () {
        // Get data
        const section = this.getAttribute('data-section').toString();
        const label = this.value;

        if (label === '') {
            throw 'All sections MUST have a label before saving';
        }

        // Add to sections
        sections[section] = label;
    });

    return sections;
}

function getDisplayBenchmark() {
    // Collect display benchmarks
    const display_benchmarks = [];

    $.each($("input[name='display_benchmarks']:checked"), function () {
        display_benchmarks.push($(this).val());
    });

    return display_benchmarks;
}

/**
 * From the set of Display Benchmarks determine which ones are
 * selected that are part of the subset
 * ['lowest_a-', 'lowest_b-', 'lowest_c-', 'lowest_d']
 *
 * @returns {[]}
 */
function getSelectedCurveBenchmarks() {
    const all_selected_benchmarks = getDisplayBenchmark();
    const result_set = [];

    all_selected_benchmarks.forEach((elem) => {
        if (benchmarks_with_input_fields.includes(elem)) {
            result_set.push(elem);
        }
    });

    return result_set;
}

function getGradeableBuckets() {
    // Collect gradeable buckets
    const gradeables = [];
    $('.bucket_detail_div').each(function () {
        // Only use buckets which have display block
        // This works even if outer container is collapsed
        if ($(this).css('display') === 'block') {
            const bucket = {};

            // Extract bucket-type
            let type = $(`#${this.id} h3`);
            type = type[0].innerHTML.toLowerCase();
            bucket.type = type;

            // Extract count
            const count = $(`#config-count-${type}`).val();
            bucket.count = parseInt(count);

            // // Extract remove_lowest
            const remove_lowest = $(`#config-remove_lowest-${type}`).val();
            bucket['remove_lowest'] = parseInt(remove_lowest);

            // Extract percent
            let percent = $(`#percent-${type}`).val();
            percent = percent / 100;
            bucket.percent = percent;

            // Extract each independent gradeable in the bucket
            const ids = [];
            const selector = `#gradeables-list-${type}`;
            $(selector).children('.gradeable-li').each(function () {
                const gradeable = {};

                const children = $(this).children();

                // Get max points
                gradeable.max = parseFloat(children[0].value);

                // Get gradeable release date
                gradeable.release_date = children[0].dataset.gradeReleaseDate;

                // Get gradeable id
                gradeable.id = $(children).find('.gradeable-id')[0].innerHTML;

                // Get per-gradeable curve data
                const curve_points_selected = getSelectedCurveBenchmarks();

                $(children).find('.gradeable-li-curve input').each(function () {
                    const benchmark = this.getAttribute('data-benchmark').toString();

                    if (curve_points_selected.includes(benchmark) && this.value) {
                        if (!Object.prototype.hasOwnProperty.call(gradeable, 'curve')) {
                            gradeable.curve = [];
                        }

                        gradeable.curve.push(parseFloat(this.value));
                    }
                });

                // Validate the set of per-gradeable curve values
                if (Object.prototype.hasOwnProperty.call(gradeable, 'curve')) {
                    // Has correct number of values
                    if (gradeable.curve.length !== curve_points_selected.length) {
                        throw `To adjust the curve for gradeable ${gradeable.id} you must enter a value in each box`;
                    }

                    let previous = gradeable.max;
                    gradeable.curve.forEach((elem) => {
                        elem = parseFloat(elem);

                        // All values are floats
                        if (isNaN(elem)) {
                            throw `All curve inputs for gradeable ${gradeable.id} must be floating point values`;
                        }

                        // Each value is greater than 0
                        if (elem < 0) {
                            throw `All curve inputs for gradeable ${gradeable.id} must be greater than or equal to 0`;
                        }

                        // Each value is less than the previous
                        if (elem > previous) {
                            throw `All curve inputs for gradeable ${gradeable.id} must be less than or equal to the maximum points for the gradeable and also less than or equal to the previous input`;
                        }

                        previous = elem;
                    });
                }

                ids.push(gradeable);
            });

            // Add gradeable buckets to gradeables array
            bucket.ids = ids;

            // Add to the gradeables array
            gradeables.push(bucket);
        }
    });

    return gradeables;
}

function getPlagiarism() {
    const plagiarismData = [];

    const tableBody = document.getElementById('table-body');
    const rows = tableBody.getElementsByTagName('tr');

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const user = row.cells[0].textContent;
        const gradeable = row.cells[1].textContent;
        const penalty = parseFloat(row.cells[2].textContent);

        plagiarismData.push({
            user: user,
            gradeable: gradeable,
            penalty: penalty,
        });
    }

    return plagiarismData;
}

function addToTable() {
    const USERID = document.getElementById('user_id').value.trim();
    const gradeable = document.getElementById('g_id').value.trim();
    const penalty = document.getElementById('marks').value.trim();

    // Check for empty fields
    if (USERID === '' || gradeable === '' || penalty === '') {
        alert('Please fill in all the fields.');
        return;
    }

    // eslint-disable-next-line no-undef
    const studentFullDataValues = studentFullData.map((item) => item.value);
    if (!studentFullDataValues.includes(USERID)) {
        alert('Invalid User ID. Please enter a valid one.');
        return;
    }

    // Check for penalty
    if (penalty > 1 || penalty < 0) {
        alert('Penalty must be between 0 - 1');
        return;
    }

    const tableBody = document.getElementById('table-body');

    // Check for duplicate entries
    const rows = tableBody.getElementsByTagName('tr');
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const existingUSERID = row.cells[0].textContent.trim();
        const existingGradeable = row.cells[1].textContent.trim();

        if (USERID === existingUSERID && gradeable === existingGradeable) {
            alert('Entry with the same Student ID and Gradeable already exists.');
            return;
        }
    }

    // Create a new row and cells
    const newRow = tableBody.insertRow();

    const cellUSERID = newRow.insertCell();
    cellUSERID.textContent = USERID;

    const cellGradeable = newRow.insertCell();
    cellGradeable.textContent = gradeable;

    const cellPenalty = newRow.insertCell();
    cellPenalty.textContent = penalty;

    const cellDelete = newRow.insertCell();
    const deleteLink = document.createElement('a');
    const deleteIcon = document.createElement('i');
    deleteIcon.className = 'fas fa-trash';
    deleteLink.appendChild(deleteIcon);
    deleteLink.onclick = function () {
        deleteRow(this);
    };
    cellDelete.appendChild(deleteLink);

    // Clear the form fields
    document.getElementById('user_id').value = '';
    document.getElementById('g_id').value = '';
    document.getElementById('marks').value = '';
}

function deleteRow(button) {
    const row = button.parentNode.parentNode;
    row.parentNode.removeChild(row);
}

function getMessages() {
    const messages = [];

    const message = $('#cust_messages_textarea').val();

    if (message) {
        messages.push(message);
    }

    return messages;
}

function getBenchmarkPercent() {
    // Collect benchmark percents
    const benchmark_percent = {};
    const selected_benchmarks = getSelectedCurveBenchmarks();

    $('.benchmark_percent_input').each(function () {
        // Get data
        const benchmark = this.getAttribute('data-benchmark').toString();
        const percent = this.value;

        if (selected_benchmarks.includes(benchmark)) {
            // Verify percent is not empty
            if (percent === '') {
                throw 'All benchmark percents must have a value before saving.';
            }

            // Verify percent is a floating point number
            if (isNaN(parseFloat(percent))) {
                throw 'Benchmark percent input must be a floating point number.';
            }

            // Add to sections
            benchmark_percent[benchmark] = percent;
        }
    });

    return benchmark_percent;
}

function getFinalCutoffPercent() {
    // Verify that final_grade is used, otherwise set values to default (which will be unused)
    if (!$("input[value='final_grade']:checked").val()) {
        return {
            'A': 93.0,
            'A-': 90.0,
            'B+': 87.0,
            'B': 83.0,
            'B-': 80.0,
            'C+': 77.0,
            'C': 73.0,
            'C-': 70.0,
            'D+': 67.0,
            'D': 60.0,
        };
    }

    // Collect benchmark percents
    const final_cutoff = {};
    const letter_grades = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D'];

    $('.final_cutoff_input').each(function () {
        // Get data
        const letter_grade = this.getAttribute('data-benchmark').toString();
        const percent = this.value;

        if (letter_grades.includes(letter_grade)) {
            // Verify percent is not empty
            if (percent === '') {
                throw 'All final cutoffs must have a value before saving.';
            }

            // Verify percent is a floating point number
            if (isNaN(parseFloat(percent))) {
                throw 'Final cutoff input must be a floating point number.';
            }

            // Add to sections
            final_cutoff[letter_grade] = percent;
        }
    });

    return final_cutoff;
}

// This function constructs a JSON representation of all the form input
function buildJSON() {
    // Build the overall json
    let ret = {
        display: getDisplay(),
        display_benchmark: getDisplayBenchmark(),
        benchmark_percent: getBenchmarkPercent(),
        final_cutoff: getFinalCutoffPercent(),
        section: getSection(),
        gradeables: getGradeableBuckets(),
        messages: getMessages(),
        plagiarism: getPlagiarism(),
    };

    ret = JSON.stringify(ret);
    return ret;
}

function showLogButton(responseData) {
    $('#show_log_button').show();
    $('#save_status_log').empty();
    $('#save_status_log').append(`<pre>${responseData}</pre>`);
}

function checkAutoRGStatus() {
    // Send request
    $.getJSON({
        type: 'POST',
        // eslint-disable-next-line no-undef
        url: buildCourseUrl(['reports', 'rainbow_grades_status']),
        // eslint-disable-next-line no-undef
        data: { csrf_token: csrfToken },
        success: function (response) {
            if (response.status === 'success') {
                $('#save_status').html('Rainbow grades successfully generated!');
                showLogButton(response.data);
            }
            else if (response.status === 'fail') {
                $('#save_status').html('A failure occurred generating rainbow grades');
                showLogButton(response.message);
            }
            else {
                $('#save_status').html('Internal Server Error');
                console.log(response);
            }
        },
        error: function (response) {
            console.error(`Failed to parse response from server: ${response}`);
        },
    });
}

// This function attempts to create a new customization.json server-side based on form input
// eslint-disable-next-line no-unused-vars
function ajaxUpdateJSON(successCallback, errorCallback) {
    try {
        $('#save_status').html('Saving...');

        // eslint-disable-next-line no-undef
        const url = buildCourseUrl(['reports', 'rainbow_grades_customization']);
        $.getJSON({
            type: 'POST',
            url: url,
            // eslint-disable-next-line no-undef
            data: { json_string: buildJSON(), csrf_token: csrfToken },
            success: function (response) {
                if (response.status === 'success') {
                    $('#save_status').html('Generating rainbow grades, please wait...');

                    // Call the server to see if auto_rainbow_grades has completed
                    checkAutoRGStatus();
                    // successCallback(response.data);
                }
                else if (response.status === 'fail') {
                    $('#save_status').html('A failure occurred saving customization data');
                    // errorCallback(response.message, response.data);
                }
                else {
                    $('#save_status').html('Internal Server Error');
                    console.error(response.message);
                }
            },
            error: function (response) {
                console.error(`Failed to parse response from server: ${response}`);
            },
        });
    }
    catch (err) {
        $('#save_status').html(err);
    }
}

function displayChangeDetectedMessage() {
    $('#save_status').text('Changes detected, press "Save Changes" to save them.');
}

/**
 * Sets the visibility for 'benchmark percent' input boxes and also per-gradeable curve input boxes
 * based upon boxes in 'display benchmark' being selected / un-selected
 *
 * @param elem The checkbox input element captured from 'display benchmark'
 */
function setInputsVisibility(elem) {
    const benchmark = elem.value;
    const is_checked = elem.checked;

    // Only care about inputs which are part of the benchmarks_with_input_fields
    if (benchmarks_with_input_fields.includes(benchmark)) {
        if (is_checked) {
            $(`.${benchmark}`).show();
        }
        else {
            $(`.${benchmark}`).hide();
        }
    }

    // If all boxes are unchecked can hide benchmark percent box and all per-gradeable curve options
    if (getSelectedCurveBenchmarks().length === 0) {
        $('#benchmark_percents').hide();
        $('.fa-gradeable-curve').hide();
        $('.gradeable-li-curve').hide();
    }
    else {
        $('#benchmark_percents').show();
        $('.fa-gradeable-curve').show();
    }
}

/**
 * Sets the visibility for input boxes other than benchmark percents
 * based on the corresponding boxes in 'display' being selected / un-selected
 * */
function setCustomizationItemVisibility(elem) {
    // maps a checkbox name to the corresponding customization item id
    const checkbox_to_cust_item = {
        final_grade: '#final_grade_cutoffs',
        messages: '#cust_messages',
        section: '#section_labels',
    };
    const checkbox_name = elem.value;
    const cust_item_id = checkbox_to_cust_item[checkbox_name];
    const is_checked = elem.checked;

    if (is_checked) {
        $(cust_item_id).show();
    }
    else {
        $(cust_item_id).hide();
    }
}

$(document).ready(() => {
    // Make the per-gradeable curve inputs toggle when the icon is clicked
    // eslint-disable-next-line no-unused-vars
    $('.fa-gradeable-curve').click(function (event) {
        const id = jQuery(this).attr('id').split('-')[3];
        $(`#gradeable-curve-div-${id}`).toggle();
    });

    // By default, open the input fields for per-gradable curves which have been previously set
    $('.gradeable-li-curve').each(function () {
        let has_at_least_one_value = false;

        // Determine if any of the input boxes had a value pre-loaded into them
        $(this).children('input').each(function () {
            if (this.value) {
                has_at_least_one_value = true;
            }
        });

        // If so then open the per-gradeable curve input div
        if (has_at_least_one_value) {
            const id = jQuery(this).attr('id').split('-')[3];
            $(`#gradeable-curve-div-${id}`).toggle();
        }
    });

    /**
     * Configure visibility handlers for curve input boxes
     * Curve input boxes include the benchmark percent input boxes and also the per-gradeable curve input boxes
     * Visibility is controlled by which boxes are selected in the display benchmarks area
     */
    $('#display_benchmarks input').each(function () {
        // Set the initial visibility on load
        setInputsVisibility(this);

        // Register a click handler to adjust visibility when boxes are selected / un-selected
        $(this).change(function () {
            setInputsVisibility(this);
        });
    });

    /**
     * Configure visibility handler for all customization items other than benchmark percents
     * Visibility is controlled by whether the corresponding boxes are selected in the display area
     */
    const dropdown_checkboxes = ['final_grade', 'messages', 'section'];
    $('#display input').each(function () {
        if (dropdown_checkboxes.includes(this.value)) {
            // Set the initial visibility on load
            setCustomizationItemVisibility(this);

            // Register a click handler to adjust visibility when boxes are selected / un-selected
            $(this).change(function () {
                setCustomizationItemVisibility(this);
            });
        }
    });

    $("input[name*='display']").change(() => {
        displayChangeDetectedMessage();
    });

    // Register change handlers to update the status message when form inputs change
    $("input[name*='display_benchmarks']").change(() => {
        displayChangeDetectedMessage();
    });

    $("input[name*='final_grade_cutoffs']").change(() => {
        displayChangeDetectedMessage();
    });

    $('#cust_messages_textarea').on('change keyup paste', () => {
        displayChangeDetectedMessage();
    });

    $('.sections_and_labels').on('change keyup paste', () => {
        displayChangeDetectedMessage();
    });
    // plagiarism option-input
    $('.option-input').on('change keyup paste', () => {
        displayChangeDetectedMessage();
    });

    // https://stackoverflow.com/questions/15657686/jquery-event-detect-changes-to-the-html-text-of-a-div
    // More Details https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
    // select the target node
    const target = document.querySelector('#buckets_used_list');
    // create an observer instance
    // eslint-disable-next-line no-unused-vars
    const observer = new MutationObserver((mutations) => {
        displayChangeDetectedMessage();
    });
    // configuration of the observer:
    const config = { attributes: true, childList: true, characterData: true };
    // pass in the target node, as well as the observer options
    observer.observe(target, config);

    // Display auto rainbow grades log on button click
    $('#show_log_button').click(() => {
        $('#save_status_log').toggle();
    });

    // Hide the loading div and display the form once all form configuration is complete
    $(document).ready(() => {
        $('#rg_web_ui_loading').hide();
        $('#rg_web_ui').show();
    });
});

$(document).ready(() => {
    $('#pencilIcon').click((event) => {
        event.stopPropagation();
        const checkboxControls = $('#checkboxControls');
        const dropLowestDiv = $('#dropLowestDiv');

        checkboxControls.css('display') === 'none'
            ? checkboxControls.show()
            : checkboxControls.hide() && dropLowestDiv.hide();
    });
    $('#drop_lowest_checkbox').change(function (event) {
        event.stopPropagation();
        const dropLowestDivs = $('div[id^="dropLowestDiv-"]');
        const isChecked = $(this).is(':checked');

        dropLowestDivs.each((index, dropLowestDiv) => {
            $(dropLowestDiv).css('display', isChecked ? 'block' : 'none');
        });
    });
});
