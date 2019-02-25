# Passman CLI Export

## Summary

Export your passman vault data from command line.

## Requirements

* [NodeJS](https://nodejs.org/en/)

## Install

```bash
$ npm -g install passman-cli-export
```

## Configure

To automate the process, you can create a file with your credentials inside.
This file must be located at `~/.config/pexp/config.json`, and should contain the following fields:
```json
{
  "baseURL": "https://my-nextcloud-instance-url.org",
  "username": "myusername",
  "password": "mypassword",
  "selectedVault": 1,
  "_key": "myVaultKey"
}
```

`selectedVault` should be the number of the vault to export, starting from 1.

> Due to the sensitive content of this file, `pexp` won't work if the file's permission are wider than 0600.

## Usage

If you have a valid configuration file, just invoke `pexp`:
```bash
$ pexp
```

For JSON export :
```bash
$ pexp -f json
```

If your config file is valid but you specify options via cli, the config file will be ignored, and you will be prompted for credentials.

An example:
```bash
$ pexp -d "https://my-nextcloud-instance-url.org" -u myusername
```

If your config file is either non valid or missing, running `pexp` will just prompt you for the required field.

If successful, `pexp` will export the credentials in the current working directory as `passman-export.csv` (or `passman-export.json` if you specify `-f json`) with 0600 permissions.

> It is highly advised that you encrypt the resulting export, with `gpg` for instance.


```bash
Usage: pexp [options]

Options:
  -V, --version           output the version number
  -d, --domain [value]    Nextcloud domain
  -u, --username [value]  Nextcloud username
  -n, --vault-number <n>  Vault number (default: 1)
  -f, --format [value]    Output format (default: "csv")
  -h, --help              output usage information
```
