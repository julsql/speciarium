from django.apps import apps
from django.core.management.color import no_style
from django.db import migrations, connection


def resync_sequences(apps_registry, schema_editor):
    models = apps.get_app_config('main').get_models()
    sequence_sql = connection.ops.sequence_reset_sql(no_style(), models)
    with connection.cursor() as cursor:
        for sql in sequence_sql:
            cursor.execute(sql)


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0006_uploadseen'),
    ]

    operations = [
        migrations.RunPython(resync_sequences, migrations.RunPython.noop),
    ]
