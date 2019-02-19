#!/usr/bin/env node

const request = require('request');
const sjcl = require('sjcl');
const fs = require('fs');
const prompts = require('prompts');
//const program = require('commander');

var fields = [
    'description',
    'username',
    'password',
    'files',
    'custom_fields',
    'otp',
    'email',
    'tags',
    'url',
]


function getVaults(options) {
  return new Promise(function(resolve, reject) {
    request(options, function (error, res, body) {
      if (error) return reject(error);
      resolve(body);
    })
  });
};


function getVaultData(options, guid) {
  options.url += '/' + guid;
  return new Promise(function(resolve, reject) {
    request(options, function (error, res, body) {
      if (error) return reject(error);
      resolve(body);
    })
  });
};


async function main() {

  const baseURL = await prompts({
    type: 'text',
    name: 'value',
    message: 'Nextcloud instance URL',
  });

  const username = await prompts({
    type: 'text',
    name: 'value',
    message: 'Username',
  });

  const password = await prompts({
    type: 'text',
    name: 'value',
    message: 'Password',
    style: 'password',
  });

  var options = {
    url: baseURL.value + '/apps/passman/api/v2/vaults',
    auth: {
      user: username.value,
      password: password.value,
    }
  }

  var body = await getVaults(options);
  var vaults = JSON.parse(body);

  if (vaults.message) {
    console.log(vaults.message);
    return;
  }

  var vaultsNames = [];
  console.log('\n Available vaults :');

  vaults.forEach(function(d, i) {
    console.log('\t' + i + '. ' + d.name);
    vaultsNames.push(d.name);
  });

  var numV = vaultsNames.length - 1;

  const selectedVault = await prompts({
    type: 'number',
    name: 'value',
    message: 'Select vault number',
    validate: value => value > numV ? 'Id should be between 0 and ' + numV : true
  });

  var data = await getVaultData(options, vaults[selectedVault.value].guid);
  var credentials = JSON.parse(data).credentials;

  const _key = await prompts({
    type: 'text',
    name: 'value',
    message: 'Vault password',
    style: 'password',
  });

  var stream = fs.createWriteStream("pass.csv");

  stream.once('open', function(fd) {
    var error = '';

    stream.write(fields.join(',') + '\n');

    credentials.forEach(function(d) {
      var line = ''
      fields.forEach(function(f) {
        var ciphertext = Buffer.from(d[f], 'base64').toString("ascii");
        var rp = {};
        try {
          var cleartext = sjcl.decrypt(_key.value, ciphertext, ciphertext, rp);
          line += cleartext + ',';
        } catch(err) {
          error = err;
        }
      });
      stream.write(line + '\n');
    });

    if (error) {
      console.log('Error when decrypting vault data : ', error.message);
    } else {
      console.log('Vault successfully exported to pass.csv !');
    }
    stream.end();
  });

}

main();
// program.command('passman-cli-export')
//   .description('Interactive prompt for passman export');
//
// program.on('passman-cli-export', () => { main() })
//   .on('*', () => { program.help() });
