# views.py
from django.contrib.auth import authenticate, login, get_user_model
from django.shortcuts import render, redirect
from django.views.decorators.http import require_POST
from main.core.frontend.login.internal.login_form import LoginForm

DEMO_USERNAME = 'temoin'

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


@require_POST
def demo_login_view(request):
    User = get_user_model()
    try:
        demo_user = User.objects.get(username=DEMO_USERNAME, is_demo=True)
    except User.DoesNotExist:
        return redirect('login')

    demo_user.backend = 'django.contrib.auth.backends.ModelBackend'
    login(request, demo_user)
    return redirect('home')
