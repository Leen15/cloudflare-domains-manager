import cloudflare = require('cloudflare');
import colors = require('colors/safe');
import dotenv = require('dotenv')
import fs = require('fs');
import yaml = require('js-yaml');

dotenv.config();

type Zone = {
  name: string;
  action: { id: string };
  jump_start?: boolean | undefined;
  type?: "full" | "partial" | undefined;
};

type ZonesResponse = { result: Zone[] };

class CloudflareDomainsManager {

  cf: cloudflare;

  async run() {
    try {
      this.cf = new cloudflare({
        email: process.env.CF_EMAIL,
        key: process.env.CF_KEY
      });

      // check cf auth
      await this.cf.user.read()

      let action: string;
      if (process.argv[2]) {
        let split = process.argv[2].split("=");
        if (split[0] == "action") {
          action = split[1];
        }
      }

      let domain: string;
      if (action == "update" && process.argv[3]) {
        domain = process.argv[3];
      }

      let dryRun = false;
      if (process.env['npm_config_dry_run'] == 'true') {
        dryRun = true;
      }

      switch (action) {
        case 'update':
          await this.updateDomains(domain, dryRun);
          break;
        case 'list':
          await this.listDomains();
          break;
        default:
          console.log(colors.red(`[ERROR] Sorry, you have to pass a valid action (update | list).
          ex: node index.js action=list` ));
          process.exit(1);
      }
    } catch (e) {
      if (e.message.includes("Forbidden")) {
        console.error(colors.red("[ERROR] Ops, are you sure to have good CF credentials?"))
      }
      else {
        console.error(e);
      }
    }
  }

  groupBy(xs: any, f) {
    return xs.reduce((r, v, i, a, k = f(v)) => ((r[k] || (r[k] = [])).push(v), r), {});
  }

  async getDnsRecords(zoneId: string) {
    return (await this.cf.dnsRecords.browse(zoneId,{
      page: 1,
      per_page: 5000
    })).result
  }

  async updateDomains(domain: string, dryRun: boolean) {
    let fileContent = fs.readFileSync('./configuration.yaml', 'utf8');
    let conf: any = yaml.load(fileContent);
    //console.log(conf.domains[0].dns_records);
    //return;
    let domains = conf.domains;
    if (domain) {
      domains = conf.domains.filter(x => x.name == domain);
    }

    var dryRunPrefix = "";
    if (dryRun) {
      console.log(colors.yellow(`** DRY RUN MODE! **\n`))
      dryRunPrefix = colors.white("[DRY-RUN] ");
    }

    for (const domain of domains) {
      // console.log(domain)
      console.log(colors.green(`Check domain: ${colors.white(domain.name)}`))

      // load the cloudflare zone dns records
      const CFdnsRecords: any = await this.getDnsRecords(domain.zone_id);
      // console.log(CFdnsRecords);

      // check conf.domains with registered dns records
      console.group();
      for (const dnsRecord of domain.dns_records) {
        // console.log(dnsRecord);
        console.log("Check record: " + colors.blue(dnsRecord.name))

        // find record in CFdnsRecords
        const CFdnsRecord = CFdnsRecords.find(x => x.name == dnsRecord.name);

        console.group();
        if (CFdnsRecord) {
          // console.log(CFdnsRecord);
          if (dnsRecord.deleted) {
            if (!dryRun) {
              await this.cf.dnsRecords.del(domain.zone_id, CFdnsRecord.id);
            }
            console.log(dryRunPrefix + colors.bgYellow("Record *Deleted*."));
          }
          else if (
            CFdnsRecord.type == dnsRecord.type &&
            CFdnsRecord.content == dnsRecord.content &&
            CFdnsRecord.ttl == dnsRecord.ttl &&
            CFdnsRecord.proxied == dnsRecord.proxied
            ) {
            console.log(dryRunPrefix + colors.green("OK."));
          }
          else {
            if (!dryRun) {
              await this.cf.dnsRecords.edit(domain.zone_id, CFdnsRecord.id, dnsRecord);
            }
            console.log(dryRunPrefix + colors.yellow("Record Updated."));
          }
        }
        else if (dnsRecord.deleted) {
          console.log(dryRunPrefix + colors.green("Record already deleted."));
        }
        else {
          if (!dryRun) {
            await this.cf.dnsRecords.add(domain.zone_id, dnsRecord);
          }
          console.log(dryRunPrefix + colors.bgYellow("Record Created."));
        }
        console.groupEnd();
      }
      console.groupEnd();
    }
  }

  async listDomains() {
  // @ts-ignore
    const zones = ((await this.cf.zones.browse({
      page: 1,
      per_page: 100
    }) as unknown) as ZonesResponse).result;
    // console.log(zones);
    const accounts = this.groupBy(zones, zone => zone.account.name);
    // console.log(accounts)

    for (const accountName of Object.keys(accounts)) {
      console.log(`account: ${colors.green(accountName)}`)
      for (const zone of accounts[accountName]) {
        console.log(`  Domain: ${colors.white(zone.name)}`)
        console.log(`    zone_id: ${colors.blue(zone.id)}`)
      }
    }
  }
}

module.exports = CloudflareDomainsManager;
