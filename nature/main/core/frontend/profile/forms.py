from django import forms


class EmailUpdateForm(forms.Form):
    email = forms.EmailField(label="Nouvel email", max_length=254)
