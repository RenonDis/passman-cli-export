#!/usr/bin/env node

const request = require('request');
const sjcl = require('sjcl');
const fs = require('fs');
const prompts = require('prompts');
const program = require('commander');

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

var baseURL,
    username,
    password,
    selectedVault,
    _key;

program
  .version('0.1.0')
  .option('-d, --domain [value]', 'Nextcloud domain')
  .option('-u, --username [value]', 'Nextcloud username')
  .option('-p, --password [value]', 'Nextcloud password')
  .option('-n, --vault-number <n>', 'Vault number', parseInt, 1)
  .option('-k, --key [value]', 'Passman vault key')
  .parse(process.argv);


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
  if (program.domain) {
    baseURL = program.domain;
  }
  if (program.username) {
    username = program.username;
  }
  if (program.password) {
    password = program.password;
  }
  if (program.vaultNumber) {
    selectedVault = program.vaultNumber;
  }
  if (program.key) {
    _key = program.key;
  }

  if (!baseURL) {
    var baseURL = await prompts({
      type: 'text',
      name: 'value',
      message: 'Nextcloud instance URL',
    });
    baseURL = baseURL.value;
  };
  console.log(typeof(baseURL));

  if (!username) {
    var username = await prompts({
      type: 'text',
      name: 'value',
      message: 'Username',
    });
    username = username.value;
  };

  if (!password) {
    var password = await prompts({
      type: 'text',
      name: 'value',
      message: 'Password',
      style: 'password',
    });
    password = password.value;
  };

  var options = {
    url: baseURL + '/apps/passman/api/v2/vaults',
    auth: {
      user: username,
      password: password,
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
    console.log('\t' + (i+1) + '. ' + d.name);
    vaultsNames.push(d.name);
  });

  var numV = vaultsNames.length;

  if (numV > 1 && !selectedVault) {
    const selectedVaultObj = await prompts({
      type: 'number',
      name: 'value',
      message: 'Select vault number',
      validate: value => value > numV ? 'Select vault from 1 to ' + numV : true
    });
    var selectedVault = selectedVaultObj.value - 1;
  } else if (numV == 1) {
    console.log('Only one vault available, exporting..');
    var selectedVault = 0;
  } else if (numV == 0) {
    console.log('No vaults available, aborting..');
    return;
  }

  var data = await getVaultData(options, vaults[selectedVault].guid);
  var credentials = JSON.parse(data).credentials;

  if (!_key) {
    var _key = await prompts({
      type: 'text',
      name: 'value',
      message: 'Vault password',
      style: 'password',
    });
    _key = _key.value;
  };

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
          var cleartext = sjcl.decrypt(_key, ciphertext, ciphertext, rp);
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
