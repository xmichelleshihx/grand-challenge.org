from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from guardian.shortcuts import assign_perm

from grandchallenge.teams.models import Team, TeamMember


@receiver(post_save, sender=Team)
def create_team_admin(
    sender: Team, instance: Team = None, created: bool = False, **kwargs
):
    if created and instance.owner.username != settings.ANONYMOUS_USER_NAME:
        TeamMember.objects.create(user=instance.owner, team=instance)
        assign_perm('change_team', instance.owner, instance)
