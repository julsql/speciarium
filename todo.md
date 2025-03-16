- Position géographique
- clean dependencies
- modification des espèces dans l'appli
- formulaire avec multiples valeurs
- amélioration pour petit écran

## Ajout d'image sur le site

Corriger erreurs
Ajouter dans les metadata les coordonnées géographiques

Étapes :
- [X] backend enregistrement des hash des images (les mêmes entre le front et le back)
- [X] frontend upload dossiers
- [X] backend endpoint envoie des hash des images
- [X] frontend récupération des hash des images
- [X] frontend analyse des fichiers pour les envoyer au back avec les hash des images à supprimer
- [X] backend à partir des images et des hash, supprimer les hash et upload les images
- [X] bonus : websocket pour indiquer où en est le téléchargement

Points bloquants :
- [X] mêmes hash entre javascript et python (sha256)
- [X] traitement pré upload : récupération image, calcul du hash, envoie au backend
