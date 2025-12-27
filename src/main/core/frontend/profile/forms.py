from django import forms
from django.contrib.auth.forms import PasswordChangeForm
from django.contrib.auth import get_user_model

User = get_user_model()


class EmailUpdateForm(forms.Form):
    email = forms.EmailField(label="Nouvel email", max_length=254)

    def __init__(self, *args, user=None, **kwargs):
        self.user = user
        super().__init__(*args, **kwargs)

    def clean_email(self):
        email = self.cleaned_data["email"]

        qs = User.objects.filter(email=email)
        if self.user:
            qs = qs.exclude(pk=self.user.pk)

        if qs.exists():
            raise forms.ValidationError(
                "Cet email est déjà utilisé par un autre compte."
            )

        return email


class UsernameUpdateForm(forms.Form):
    username = forms.CharField(
        label="Nouveau nom d'utilisateur",
        max_length=150
    )

    def __init__(self, *args, user=None, **kwargs):
        self.user = user
        super().__init__(*args, **kwargs)

    def clean_username(self):
        username = self.cleaned_data["username"]

        qs = User.objects.filter(username=username)
        if self.user:
            qs = qs.exclude(pk=self.user.pk)

        if qs.exists():
            raise forms.ValidationError(
                "Ce nom d'utilisateur est déjà utilisé."
            )

        return username


class CustomPasswordChangeForm(PasswordChangeForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Supprimer le autofocus du champ 'old_password'
        self.fields['old_password'].widget.attrs.pop('autofocus', None)
