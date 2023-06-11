# Website

# Dependencies

```
sudo apt install npm
npm install katex # Run in the base of this repo
```

# Deploy

Deployment is done by pushing to the gh-pages branch to this repo.

The recommended setup is to clone this repo twice, once on this branch, and once on gh-pages, like so

```
git clone git@github.com:alspitz/alspitz.github.io
git clone git@github.com:alspitz/alspitz.github.io -b gh-pages alspitz-deploy
```

Then, run

```
python src/jimothy.py
```

After that, inspect changes in alspitz-deploy, commit, and push.
