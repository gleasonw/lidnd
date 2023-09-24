### {{ overview.name }}

{{ overview.description if overview.description else '' }}

### Participants

{% for participant in overview.participants %}
{% if participant.is_active %}🟢{% else %}🔴{% endif %} {{ participant.name }} - {{ participant.hp }} HP
{% if participant.is_active %}![Creature Icon](https://dnd-init-tracker-icons-stats.s3.us-west-1.amazonaws.com/icon-{{ participant.creature_id }}.png){% endif %}
{% endfor %}
