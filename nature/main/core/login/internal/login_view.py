# views.py
from django.contrib.auth import authenticate, login
from django.shortcuts import render, redirect
from main.core.login.internal.login_form import LoginForm

def login_view(request):
    if request.method == 'POST':
        form = LoginForm(request.POST)
        if form.is_valid():
            # Récupération des données du formulaire
            username = form.cleaned_data['username']
            password = form.cleaned_data['password']

            # Authentification de l'utilisateur
            user = authenticate(username=username, password=password)
            if user is not None:
                login(request, user)
                return redirect('home')  # Redirige vers la page d'accueil ou une autre page
            else:
                form.add_error(None, "Nom d'utilisateur ou mot de passe incorrect.")
    else:
        form = LoginForm()

    return render(request, 'login/module.html', {'form': form})
