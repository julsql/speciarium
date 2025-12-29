# views.py
from django.contrib.auth import login, get_user_model
from django.shortcuts import render, redirect
from main.core.frontend.signup.internal.signup_form import SignupForm
from main.models.collection import Collection

User = get_user_model()


def signup_view(request):
    if request.method == "POST":
        form = SignupForm(request.POST)
        if form.is_valid():
            username = form.cleaned_data["username"]
            collection = Collection.objects.create(title=f"Collection de {username}")

            user = User.objects.create_user(
                username=username,
                email=form.cleaned_data["email"],
                password=form.cleaned_data["password1"],
                first_name=form.cleaned_data["first_name"],
                last_name=form.cleaned_data["last_name"],
                current_collection=collection
            )
            collection.owner = user
            collection.accounts.add(user)
            collection.save()
            login(request, user)
            return redirect("home")
    else:
        form = SignupForm()

    return render(request, "signup/module.html", {"form": form})
