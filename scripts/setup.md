# Personal VPS Setup Guide

This is how I set up a DigitalOcean droplet with Ubuntu 24. My domain is on Cloudflare which I'm using as a reverse proxy.

## Update packages

My ssh key was configured beforehand.

```sh
ssh root@42.42.42.42

apt update && apt upgrade -y

# run if update needs a restart
reboot
```

## Create user

```sh
# create user w/ password, other info can be blank
adduser bob

# add to sudo group
usermod -aG sudo bob

# sanity check
su - bob # switch to newly created user
sudo whoami # should output root, type exit to unswitch

# copy ssh public key to new user's directory
# --archive copies permissions etc
# --chown changes owner/group
rsync --archive --chown=bob:bob ~/.ssh /home/bob

# sanity check
ls -la /home/bob/.ssh/ # should see authorized_keys with -rw-------

# sanity check from different terminal
ssh bob@42.42.42.42
```

## SSH config uses Harden

```sh
vi /etc/ssh/sshd_config
```

Set these options to disable root from logging in.

```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

```sh
sshd -t # outputs nothing if config ok, otherwise fix

# DO NOT CLOSE CURRENT SESSION AFTER RUNNING
systemctl restart ssh
# MAKE SURE YOU CAN SSH IN
ssh bob@42.42.42.42 # ok to close root session if this works
```

## Firewall

```sh
# Allow incoming SSH connections
sudo ufw allow OpenSSH # OpenSSH or ssh or 22/tcp do same thing

# CHECK YOU CAN SSH IN AFTER RUNNING
sudo ufw enable

sudo ufw status verbose
```

You should see `Default: deny (incoming)` and connections to `22/tcp (OpenSSH)` allowed.

## fail2ban

Automatically ban ips that repeatedly fail SSH logins.

```sh
sudo apt install fail2ban -y

# verify running
sudo systemctl status fail2ban
# verify starts on reboot
sudo systemctl is-enabled fail2ban

# otherwise
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

## Nginx

```sh
sudo apt install nginx -y

# verify running
sudo systemctl status nginx
# verify starts on reboot
sudo systemctl is-enabled nginx

# otherwise
sudo systemctl start nginx
sudo systemctl enable nginx
```

### More firewall rules

If you aren't restricting inbound traffic like I am, now you can do
`sudo ufw allow 'Nginx Full`.

In my case, I'm only allowing HTTPS traffic from Cloudflare.

```sh
for ip in $(curl -s https://www.cloudflare.com/ips-v4); do
  sudo ufw allow from $ip to any port 443 proto tcp
done

for ip in $(curl -s https://www.cloudflare.com/ips-v6); do
  sudo ufw allow from $ip to any port 443 proto tcp
done
```

Whenever you update ufw rules, make sure to reload and check.

```sh
sudo ufw reload
sudo ufw status verbose
```

### Cloudflare Origin Certificate sidequest

Go to domain, SSL/TLS -> Origin Server -> Create certificate and leave defaults (covers example.com and \*.example.com with 15 year expiry).

```sh
sudo mkdir -p /etc/ssl/cloudflare

# paste origin certificate
sudo vi /etc/ssl/cloudflare/origin.pem

# paste private key
sudo vi /etc/ssl/cloudflare/origin.key

# origin.key is secret so restrict to root
sudo chmod 600 /etc/ssl/cloudflare/origin.key
# origin.pem is whatever
sudo chmod 644 /etc/ssl/cloudflare/origin.pem

# sanity check
ls -l /etc/ssl/cloudflare
```

## Back to Nginx config

`/etc/nginx/sites-available/` you edit config files here

`/etc/nginx/sites-enabled/` symlinked files from `sites-available`

```sh
# remove default config, file still exists in sites-available
sudo rm /etc/nginx/sites-enabled/default

sudo vi /etc/nginx/sites-available/wordmongering
```

In Cloudflare, I have SSL/TLS mode set to Full (Strict), Always Use HTTPS, and a rule redirecting www to apex. Here is my very specific config with that in mind.

```
server {
    listen 443 ssl;
    server_name wordmongering.com;

    ssl_certificate /etc/ssl/cloudflare/origin.pem;
    ssl_certificate_key /etc/ssl/cloudflare/origin.key;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $http_cf_connecting_ip;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Ask your AI about your specific situation. The rate limiter requires the `X-Real-IP` header I get via CF-Connecting-IP. You might want to use `$remote_addr`. Still not sure about `X-Forwarded-For` and `X-Forwarded-Proto`.

```sh
sudo nginx -t # outputs tests is successful

sudo systemctl reload nginx
```

## Docker

Install Docker Engine following instructions from https://docs.docker.com/engine/install

The `ufw` warning applies if you expose container port directly, but this guide uses nginx on the host as a reverse proxy, so it doesn't apply.

You don't need to install all packages, if you don't plan on building image on VPS. `docker-buildx-plugin` and `docker-ce-rootless-extras` can be excluded for example.

```sh
# If you already installed it
sudo apt remove docker-buildx-plugin -y
# remove leftover deps
sudo apt autoremove -y
```

Building on a cheap droplet is a miserable experience, so I opted to use Github actions to build and upload to registry, then pull built image. My repo is public so no need for secrets, your mileage may vary.

```sh
# Add user to docker group to avoid needing sudo on commands
sudo usermod -aG docker $USER

# Technically all you need is compose.yml
git clone git@github.com:zhengkyl/wordmongering.git

cd wordmongering

# get latest image
docker compose pull

# start running detached
docker compose up -d
```
