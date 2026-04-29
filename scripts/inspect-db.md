# Inspecting deployed database

My current solution is to copy the data and inspect locally.

```sh
ssh bob@42.42.42.42

# DB is in docker volume path which is root only, copy to accessible path
docker cp wordmongering-app-1:/app/data/data.db /tmp/copy.db

# From local terminal
scp bob@42.42.42.42:/tmp/copy.db data/data.db

# From remote, cleanup
rm /tmp/copy.db

nr db:studio
```
