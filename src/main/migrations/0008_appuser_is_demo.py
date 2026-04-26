from django.contrib.auth.hashers import make_password
from django.db import migrations, models


DEMO_USERNAME = 'temoin'
DEMO_EMAIL = 'temoin@speciarium.local'


def create_demo_user(apps, schema_editor):
    AppUser = apps.get_model('main', 'AppUser')
    MapTiles = apps.get_model('main', 'MapTiles')
    Theme = apps.get_model('main', 'Theme')

    map_tiles = MapTiles.objects.filter(name='default').first()
    theme = Theme.objects.filter(name='default').first()

    AppUser.objects.update_or_create(
        username=DEMO_USERNAME,
        defaults={
            'email': DEMO_EMAIL,
            'password': make_password(None),
            'is_demo': True,
            'is_active': True,
            'is_staff': False,
            'is_superuser': False,
            'map_tiles': map_tiles,
            'theme': theme,
        },
    )


def delete_demo_user(apps, schema_editor):
    AppUser = apps.get_model('main', 'AppUser')
    AppUser.objects.filter(username=DEMO_USERNAME).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0007_resync_sequences'),
    ]

    operations = [
        migrations.RunSQL(
            sql='ALTER TABLE main_appuser ALTER COLUMN current_collection_id DROP NOT NULL;',
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.AddField(
            model_name='appuser',
            name='is_demo',
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(create_demo_user, delete_demo_user),
    ]
