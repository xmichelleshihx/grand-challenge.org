from celery import shared_task

from jqfileupload.widgets.uploader import cleanup_stale_files


@shared_task
def cleanup_stale_uploads():
    cleanup_stale_files()