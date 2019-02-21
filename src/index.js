#!/usr/bin/env node

const request = require('request');
const sjcl = require('sjcl');
const fs = require('fs');
const prompts = require('prompts');
const program = require('commander');
const homedir = require('os').homedir();
const configPath = homedir + '/.config/pexp/config.json';
const exportPath = 'passman-export.csv';


var fields = [
  'username',
  'password',
  'email',
  'description',
  'tags',
  'url',
  'custom_fields',
  'files',
  'otp',
]

var config = {
  baseURL: "",
  username: "",
  password: "",
  selectedVault: "",
  _key: "",
}

program
  .version('0.1.0')
  .option('-d, --domain [value]', 'Nextcloud base URL')
  .option('-u, --username [value]', 'Nextcloud username')
  .option('-n, --vault-number <n>', 'Vault number', parseInt, 1)
  .parse(process.argv);


function checkPerm() {
  fs.stat(configPath, function (err, stats) {
    try {
      var configPerm = '0' + (stats.mode & parseInt('777', 8)).toString(8);
    } catch(e) {
      return;
    }
    if (parseInt(configPerm[1]) > 6 | configPerm.slice(2,4) != '00') {
      throw new Error('Error : Permission of ' + configPath + ' should be 0600 or less');
    }
  });
}


function checkConfig(loadedConfig) {
  for (var key in config) {
    if (!loadedConfig[key]) {
      console.log('Warning : ' + key + ' field missing from config file.');
      console.log('Warning : Config file ignored.');
      return false;
    }
  }
  return true;
}


function getRequestOptions(route) {
  return {
    url: config.baseURL + '/apps/passman/api/v2' + route,
    auth: {
      user: config.username,
      password: config.password,
    }
  }
};


function getVaults() {
  var options = getRequestOptions('/vaults');
  return new Promise(function(resolve, reject) {
    request(options, function (error, res, body) {
      if (error) return reject(error);
      resolve(body);
    })
  });
};


function getVaultData(guid) {
  var options = getRequestOptions('/vaults/' + guid);
  return new Promise(function(resolve, reject) {
    request(options, function (error, res, body) {
      if (error) return reject(error);
      resolve(body);
    })
  });
};


function getFile(id) {
  var options = getRequestOptions('/file/' + id);
  return new Promise(function(resolve, reject) {
    request(options, function (error, res, body) {
      if (error) return reject(error);
      resolve(body);
    })
  });
};

async function main() {

  try {
    checkPerm();
  } catch(e) {
    console.log(e);
    return;
  }

  var isValidConfig = false;

  try {
    loadedConfig = require(configPath);
    isValidConfig = checkConfig(loadedConfig);
  } catch(err) {
    console.log('Warning : Trying to load ' + configPath);
    console.log('Warning : Config file is either missing or badly formatted.');
  }

  // loading config only if fully valid
  if (isValidConfig) {
    config = loadedConfig;
    console.log('Successfully loaded config from ' + configPath);
  }

  // Override config file fields if specified through cli
  if (program.domain) {
    config.baseURL = program.domain;
  }
  if (program.username) {
    config.username = program.username;
  }
  if (program.vaultNumber) {
    config.selectedVault = program.vaultNumber;
  }

  if (!config.baseURL) {
    var baseURLPrompt = await prompts({
      type: 'text',
      name: 'value',
      message: 'Nextcloud instance URL',
    });
    config.baseURL = baseURLPrompt.value;
  };

  if (!config.username) {
    var usernamePrompt = await prompts({
      type: 'text',
      name: 'value',
      message: 'Username',
    });
    config.username = usernamePrompt.value;
  };

  if (!config.password) {
    var passwordPrompt = await prompts({
      type: 'text',
      name: 'value',
      message: 'Password',
      style: 'password',
    });
    config.password = passwordPrompt.value;
  };

  var body = await getVaults();
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

  if (numV > 1 && !config.selectedVault) {
    const selectedVaultPrompt = await prompts({
      type: 'number',
      name: 'value',
      message: 'Select vault number',
      validate: value => value > numV ? 'Select vault from 1 to ' + numV : true
    });
    config.selectedVault = selectedVaultPrompt.value - 1;
  } else if (numV == 1) {
    console.log('Only one vault available, exporting..');
    config.selectedVault = 0;
  } else if (numV == 0) {
    console.log('No vaults available, aborting..');
    return;
  }

  var data = await getVaultData(vaults[config.selectedVault].guid);
  //console.log(data);
  var credentials = JSON.parse(data).credentials;

  if (!config._key) {
    var _keyPrompt = await prompts({
      type: 'text',
      name: 'value',
      message: 'Vault password',
      style: 'password',
    });
    config._key = _keyPrompt.value;
  };





  var error = '';
  var exportCSV = '"label",' + fields.join('","') + '\n';

  for (const d of credentials) {
    exportCSV += '"' + d['label'] + '",';
    var line = '';

    for (const f of fields) {
      var cipherText = Buffer.from(d[f], 'base64').toString("ascii");
      var rp = {};
      try {
        var clearText = sjcl.decrypt(config._key, cipherText, cipherText, rp);

        if (f == 'files') {
          fileJSON = JSON.parse(clearText);
          var files = [];
          for (var i = 0; i < fileJSON.length; i++) {

            var fileData = await getFile(fileJSON[i].file_id);
            fileData = JSON.parse(fileData);
            fileContent = fileData.file_data;
            fileName = fileData.filename;

            var cipherFile = Buffer.from(fileContent, 'base64').toString("ascii");
            var cipherName = Buffer.from(fileName, 'base64').toString("ascii");
            var clearFile = sjcl.decrypt(config._key, cipherFile, cipherFile, rp);
            var clearName = sjcl.decrypt(config._key, cipherFile, cipherFile, rp);
            fileData.file_data = clearFile;
            fileData.filename = fileJSON[i].filename;
            files.push(fileData);
          }
          line += JSON.stringify(files) + ',';
        } else {
          line += clearText + ',';
        }

      } catch(err) {
        error = err;
      }
    }
    exportCSV += line + '\n';
  }

  if (error) {
    console.log('Error when decrypting vault data : ', error.message);
  } else {
    console.log('Vault successfully exported to ' + exportPath + ' !');
  }


  var stream = fs.createWriteStream(exportPath, { mode: 0o600 });

  stream.once('open', function(fd) {
    stream.write(exportCSV);
    stream.end();
  });

}

main();
