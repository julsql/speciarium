import secrets

from django.db import migrations, models


def populate_tokens(apps, schema_editor):
    AppUser = apps.get_model('main', 'AppUser')
    for user in AppUser.objects.filter(retrospective_share_token__isnull=True).only('pk'):
        user.retrospective_share_token = secrets.token_urlsafe(32)
        user.save(update_fields=['retrospective_share_token'])


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0009_uploadaction_images_changed'),
    ]

    operations = [
        migrations.AddField(
            model_name='appuser',
            name='retrospective_share_token',
            field=models.CharField(editable=False, max_length=64, null=True),
        ),
        migrations.RunPython(populate_tokens, migrations.RunPython.noop),
    ]
