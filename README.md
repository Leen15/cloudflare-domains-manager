### Cloudflare Domains Manager

This tool is helpful to manage cloudflare domains using a versionated file.<br/>

## How to use?

Create a folder for your new project:
```
mkdir test-domains
cd test-domains
```

Create a new node app:
```
npm init
```

Install this package:
```
npm i cloudflare-domains-manager
```

Create a index.js with this content:
```
const CloudflareDomainsManager = require ('cloudflare-domains-manager')

const cdm = new CloudflareDomainsManager();
cdm.run();
```

Create a .env file with your clouflare data:
```
CF_EMAIL=(your cloudflare email)
CF_KEY= (your cloudflare token)
```
you can generate your cloudflare token here: https://dash.cloudflare.com/profile/api-tokens


Edit the package.json adding these lines:
```
  "main": "index.js",
  "scripts": {
    "update": "node index.js action=update",
    "list": "node index.js action=list"
  }
```

install the dependencies:
```
npm install
```

you can now get a list of your domains with:
```
npm run list
```

## The configuration file

if it works, you can now create your `configuration.yaml` file starting with something like:
```
load_balancers:
  - example-lb: &example-lb example-lb.your-infrastructure.com
  - example-lb-ip: &example-lb-ip 172.0.0.10
domains:
  - name: example.com
    zone_id: Y0UR_Z0N3_1D
    dns_records:
      - name: example.com
        type: CNAME
        content: *example-lb
        ttl: 1
        proxied: true
      - name: test.example.com
        type: A
        content: *example-lb-ip
        ttl: 1
        proxied: true
      - name: www.example.com
        type: CNAME
        content: *example-lb
        ttl: 1
        proxied: true
      - name: tobedeleted.example.com
        type: CNAME
        deleted: true
        content: *example-lb
        ttl: 1
        proxied: true
```

In the configuration:
- `ttl=1` is the automatic ttl provided by cloudflare.<br/>
- `proxied=true` means the record will be proxed by cloudflare system.<br/>
- `deleted=true` means the record will be delete from cloudflare. Use it only when you need to delete a dns record. You can remove the dns from the yaml after the deletion.<br/>

Please use load balancers mapping instead of explicit value in DNS records.<br/>


## Commands list

- `npm run list`: Get the list of all your domains in cloudflare
- `npm run update`: Update all your cloudflare domains with the content of `configuration.yaml`. Domains that don't exist in the file will be ignored
- `npm run update example.com`: Update only the domain `example.com`
- `npm run update example.com --dry-run`: Update the domain `example.com` in dry-run mode (nothing will change in cloudflare)
