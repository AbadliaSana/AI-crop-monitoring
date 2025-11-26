from agent.models import AgentRecommendation
from agent.rules import rule_engine
from agent.templates import wrap_explanation


def create_recommendation_for_event(event):
    """
    Creates AgentRecommendation when ML pipeline detects anomaly.
    """
    rule = rule_engine(event)
    explanation = wrap_explanation(rule, event)

    rec, _ = AgentRecommendation.objects.get_or_create(
        anomaly_event=event,
        defaults={
            "action": rule.action,
            "explanation": explanation,
            "confidence": rule.confidence,
        },
    )
    return rec
