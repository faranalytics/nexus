# Nexus

## Materials

### Phone Provider

Telnyx

### Speech to text

Deepgram

### Text to speech

11Labs


```bash
git reset --mixed $(git log --pretty=format:"%h" | tail -n -1) && git status && git add . && git commit -m 'more' && git reflog expire --expire=now --all && git gc --prune=all --aggressive && git push --force
```