# Passman CLI Export

## Summary

Export your passman vault data from command line.

## Requirements

* [NodeJS](https://nodejs.org/en/)

## Install

```bash
$ npm -g install passman-cli-export
```

## Usage

An example:
```bash
$ pexp -d "https://my-nextcloud-instance-url.org" -u myusername -p mypassword -n <myVaultNumber> -k myvaultkey
```


```bash
Usage: pexp [options]

Options:
  -V, --version           output the version number
  -d, --domain [value]    Nextcloud domain
  -u, --username [value]  Nextcloud username
  -p, --password [value]  Nextcloud password
  -n, --vault-number <n>  Vault number (default: 1)
  -k, --key [value]       Passman vault key
  -h, --help              output usage information
```

If an argument is not specified, it will be prompted.
