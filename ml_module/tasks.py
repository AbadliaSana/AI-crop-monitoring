# ml_module/tasks.py
from celery import shared_task
from django.apps import apps

from .pipeline import run_anomaly_detection_for_plot


@shared_task
def run_anomaly_detection_for_plot_task(plot_id: int):
    Plot = apps.get_model("farms", "FieldPlot")
    try:
        plot = Plot.objects.get(id=plot_id)
    except Plot.DoesNotExist:
        return {"plot_id": plot_id, "error": "plot_not_found"}

    event, debug_info = run_anomaly_detection_for_plot(plot)

    return {
        "plot_id": plot_id,
        "event_id": event.id if event else None,
        "combined_score": debug_info.get("combined_score") if debug_info else None,
    }
