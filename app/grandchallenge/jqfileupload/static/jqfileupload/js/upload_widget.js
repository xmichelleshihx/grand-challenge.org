"use strict";

var upload_csrf_token;

function upload_fold_unfold(element) {
    // Find the parent-foldable element
    element = $(element);
    while (!element.hasClass("foldable")) {
        element = element.parent();
        if (element.length === 0) {
            throw Error("No parent element with class 'foldable' found");
        }
    }
    element.toggleClass("folded");
}

(function () {
    var csrf_token = null;

    function init_upload(upload_element) {
        upload_element = $(upload_element);
        var dropzone = upload_element;
        var form_element = upload_element.find("input[type='hidden']");
        var failed_files_list = upload_element.find("div.failed-list");
        var is_multiupload = upload_element.attr("multi_upload") === "true";

        var target_url = upload_element.attr("upload_target");

        upload_element.fileupload(
            {
                url: target_url,
                dropZone: dropzone,
                maxChunkSize: 8000000,
                retryTimeout: 500,
                maxRetries: 50,
                headers: {
                    "X-CSRFToken": csrf_token
                }
            });

        var drop_overlay_timer = null;
        var drop_here_floater = upload_element.find(".drop-here-floater");

        function show_drop_overlay() {
            if (drop_overlay_timer !== null) {
                clearTimeout(drop_overlay_timer);
                drop_overlay_timer = null;
            } else {
                drop_here_floater.css("display", "block");
            }
            drop_overlay_timer = setTimeout(hide_drop_overlay, 2000000);
        }

        function hide_drop_overlay() {
            if (drop_overlay_timer !== null) {
                clearTimeout(drop_overlay_timer);
                drop_overlay_timer = null;
            }
            drop_here_floater.css("display", "none");
        }

        dropzone.on('dragover', function (e) {
            show_drop_overlay();
        });
        drop_here_floater.on('dragleave', function (e) {
            console.log("dragleave");
            hide_drop_overlay();
        });
        drop_here_floater.on('dragexit', function (e) {
            console.log("dragexit");
            hide_drop_overlay();
        });
        drop_here_floater.on('drop', function (e) {
            hide_drop_overlay();
        });

        failed_files_list.find("button.remove").on("click", function (element) {
            failed_files_list.css("display", "none");
            failed_files_list.addClass("folded");
            failed_files_list.find("span.count").text("0");
            failed_files_list.find("div.failed-upload").remove();
        });

        function add_failed_upload(filename, message) {
            failed_files_list.css("display", "block");
            var countSpan = failed_files_list.find("span.count");
            countSpan.text("" + (parseInt(countSpan.text(), 10) + 1));
            failed_files_list.append($("<div class='failed-upload'><p><span class='left'>" + filename + "</span>" + message + "</p></div>"));
        }

        function generate_uploaded_file_element(filename, uuid, extra_attributes) {
            return $("<div class='uploaded-file'>Uploaded: " + filename + "</div>")
        }

        var succeeded_uploads_list = [];

        function clear_succeeded_list() {
            succeeded_uploads_list = [];
            upload_element.find("div.uploaded-file").remove();
            update_hidden_form_element();
        }

        function add_succeeded_upload(file_info_list) {
            for (var i = 0; i < file_info_list.length; i++) {
                var file_info = file_info_list[i];
                upload_element.append(
                    generate_uploaded_file_element(
                        file_info.filename,
                        file_info.uuid,
                        file_info.extra_attrs
                    )
                );
                succeeded_uploads_list.push(file_info);
            }
            update_hidden_form_element();

            if (!is_multiupload) {
                upload_element.closest('form').submit();
            }
        }

        function update_hidden_form_element() {
            var uuid_list_string = "";
            for (var i = 0; i < succeeded_uploads_list.length; i++) {
                if (uuid_list_string !== "") {
                    uuid_list_string += ",";
                }
                uuid_list_string += succeeded_uploads_list[i].uuid;
            }
            form_element.val(uuid_list_string);
            console.log("uuid_list_string = " + uuid_list_string);
        }

        function generate_unique_file_handle_id(file) {
            var rnd = "" + Math.floor(Math.random() * 1000000);
            var date = (new Date).toISOString();
            var filename = file.name.slice(0, 32);
            return filename + '_' + rnd + '_' + date;
        }

        var fileinput_button = upload_element.find("span.fileinput-button");
        var progress_div = upload_element.find("div.progress");

        upload_element.on('fileuploadsubmit', function (e, data) {
            if (!is_multiupload) {
                fileinput_button.css("display","none");
                progress_div.css("display", "block");
            }
            data.formData = {
                "X-Upload-ID": generate_unique_file_handle_id(data.files[0])
            };
        });

        var progress_bar = progress_div.find(".progress-bar");

        upload_element.on('fileuploaddone', function (e, data) {
            if (!is_multiupload) {
                clear_succeeded_list();
            }
            progress_bar.removeClass("progress-bar-info progress-bar-striped active").addClass("progress-bar-success");
            add_succeeded_upload(data.result);
        });

        upload_element.on('fileuploadfail', function (e, data) {
            if (!is_multiupload) {
                clear_succeeded_list();
                progress_bar.removeClass("progress-bar-info progress-bar-striped active").addClass("progress-bar-danger");
            }
            for (var i = 0; i < data.files.length; i++) {
                var file = data.files[i];
                add_failed_upload(file.name, "Sending failed.");
            }
        });

        upload_element.on('fileuploadprogressall', function (e, data) {
            var progress = parseInt(data.loaded / data.total * 100, 10);
            progress_bar.css(
                'width',
                progress + '%'
            );
        });

    }

    $(function () {
        if (typeof upload_csrf_token !== 'undefined') {
            csrf_token = upload_csrf_token;
        } else {
            // Try to find a django-hidden control with the correct value
            var elements = $("input[name='csrfmiddlewaretoken']");
            if (elements.length > 0) {
                csrf_token = elements.attr("value");
            }
        }

        if (!csrf_token) {
            throw Error("Could not find a CSRF token, the uploads will not work!");
        } else {
            var file_uploads = $(".file-upload");
            for (var i = 0; i < file_uploads.length; i++) {
                init_upload(file_uploads[i]);
            }
        }
    });
})();
