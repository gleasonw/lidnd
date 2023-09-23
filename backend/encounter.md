### {{ overview.name }}

{{ overview.description if overview.description else '' }}

### Participants

{% for participant in overview.participants %}
{% if participant.is_active %}🟢{% else %}🔴{% endif %} {{ participant.name }} - {{ participant.hp }} HP
{% endfor %}
