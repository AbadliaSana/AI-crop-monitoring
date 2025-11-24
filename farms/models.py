from django.db import models
from django.contrib.auth.models import User


class FarmProfile(models.Model):
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="farms",
        help_text="Le propriétaire (utilisateur) de l'exploitation."
    )
    name = models.CharField(
        max_length=100,
        help_text="Nom unique de l'exploitation pour ce propriétaire."
    )
    location = models.CharField(
        max_length=255,
        help_text="Localisation générale de la ferme (ville, région, pays)."
    )
    size_ha = models.FloatField(
        help_text="Superficie de la ferme en hectares."
    )
    crop_type = models.CharField(
        max_length=100,
        help_text="Culture principale (ex: blé, maïs, olivier, etc.)."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("owner", "name")
        ordering = ["owner", "name"]
        verbose_name = "Ferme"
        verbose_name_plural = "Fermes"

    def __str__(self):
        return f"{self.name} ({self.owner.username})"


class FieldPlot(models.Model):
    farm = models.ForeignKey(
        FarmProfile,
        on_delete=models.CASCADE,
        related_name="plots",
        help_text="Ferme à laquelle appartient cette parcelle."
    )
    name = models.CharField(
        max_length=100,
        help_text="Nom de la parcelle au sein de la ferme."
    )
    crop_variety = models.CharField(
        max_length=100,
        help_text="Variété cultivée dans cette parcelle."
    )
    area_m2 = models.FloatField(
        help_text="Surface de la parcelle en m²."
    )
    status = models.CharField(
        max_length=20,
        choices=(
            ("active", "Active"),
            ("inactive", "Inactive"),
        ),
        default="active",
        help_text="Statut de la parcelle."
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("farm", "name")
        ordering = ["farm", "name"]
        verbose_name = "Parcelle"
        verbose_name_plural = "Parcelles"

    def __str__(self):
        return f"{self.farm.name} - {self.name}"

