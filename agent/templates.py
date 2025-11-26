def wrap_explanation(rule_result, event):
    """
    Adds plot name, severity & contextual insight.
    """
    return (
        f"[Plot: {event.plot.name}] Severity: {event.severity.capitalize()}\n"
        f"{rule_result.explanation}\n\n"
        f"Action: {rule_result.action}"
    )
