# {{ overview.name }}

===================

{% for participant in overview.participants %}
{% if participant.is_active %}**{{ participant.name }}**{% else %}{{ participant.name }}{% endif %}{% if settings.show_health_in_discord %} `{{ participant.hp }} HP`{% endif %}{% if participant.is_active %} ![Active](https://dnd-init-tracker-icons-stats.s3.us-west-1.amazonaws.com/icon-{{ participant.creature_id }}.png){% endif %}
{% endfor %}

===================
