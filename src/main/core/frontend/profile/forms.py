from django import forms


class EmailUpdateForm(forms.Form):
    email = forms.EmailField(label="Nouvel email", max_length=254)

from django.contrib.auth.forms import PasswordChangeForm

class CustomPasswordChangeForm(PasswordChangeForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Supprimer le autofocus du champ 'old_password'
        self.fields['old_password'].widget.attrs.pop('autofocus', None)
