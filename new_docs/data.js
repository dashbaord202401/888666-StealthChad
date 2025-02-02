const Data = {
  template: `
  <div>
    <b-button v-b-toggle.data-module size="sm" block variant="outline-info">Data</b-button>
    <b-collapse id="data-module" visible class="my-2">
      <b-card no-body class="border-0">
        <b-row>
          <b-col cols="4" class="small">Accounts</b-col>
          <b-col class="small truncate" cols="8">{{ Object.keys(accounts).length }}</b-col>
        </b-row>
        <b-row>
          <b-col cols="4" class="small">Transactions</b-col>
          <b-col class="small truncate" cols="8">{{ Object.keys(txs).length }}</b-col>
        </b-row>
        <b-row>
          <b-col cols="4" class="small">Assets</b-col>
          <b-col class="small truncate" cols="8">{{ Object.keys(assets).length }}</b-col>
        </b-row>
        <b-row>
          <b-col cols="4" class="small">ENS Map</b-col>
          <b-col class="small truncate" cols="8">{{ Object.keys(ensMap).length }}</b-col>
        </b-row>
      </b-card>
    </b-collapse>
  </div>
  `,
  data: function () {
    return {
      count: 0,
      reschedule: true,
    }
  },
  computed: {
    powerOn() {
      return store.getters['connection/powerOn'];
    },
    explorer () {
      return store.getters['connection/explorer'];
    },
    coinbase() {
      return store.getters['connection/coinbase'];
    },
    network() {
      return store.getters['connection/network'];
    },
    accounts() {
      return store.getters['data/accounts'];
    },
    mappings() {
      return store.getters['data/mappings'];
    },
    txs() {
      return store.getters['data/txs'];
    },
    assets() {
      return store.getters['data/assets'];
    },
    ensMap() {
      return store.getters['data/ensMap'];
    },
  },
  methods: {
    async timeoutCallback() {
      logDebug("Data", "timeoutCallback() count: " + this.count);
      this.count++;
      var t = this;
      if (this.reschedule) {
        setTimeout(function() {
          t.timeoutCallback();
        }, 15000);
      }
    },
  },
  beforeDestroy() {
    logDebug("Data", "beforeDestroy()");
  },
  mounted() {
    logDebug("Data", "mounted() $route: " + JSON.stringify(this.$route.params));
    store.dispatch('config/restoreState');
    this.reschedule = true;
    logDebug("Data", "Calling timeoutCallback()");
    this.timeoutCallback();
  },
  destroyed() {
    this.reschedule = false;
  },
};

const dataModule = {
  namespaced: true,
  state: {
    accounts: {}, // Address => Account
    registry: {}, // Address => StealthMetaAddress
    accountsInfo: {}, // account => Account Info(type, name, symbol, decimals)
    mappings: {}, // Various mappings
    txs: {}, // account => Txs(timestamp, tx, txReceipt)
    txsInfo: {}, // account => Txs Info
    blocks: {}, // blockNumber => timestamp and account balances
    functionSelectors: {}, // selector => [functions]
    eventSelectors: {}, // selector => [events]
    assets: {},
    ensMap: {},
    exchangeRates: {},
    sync: {
      section: null,
      total: null,
      completed: null,
      halt: false,
    },
    db: {
      name: "magicalinternetmoneydata081a",
      version: 1,
      schemaDefinition: {
        announcements: '[chainId+blockNumber+logIndex],[blockNumber+contract],contract,confirmations',
        registrations: '[chainId+blockNumber+logIndex],[blockNumber+contract],contract,confirmations',
        tokenEvents: '[chainId+blockNumber+logIndex],[blockNumber+contract],contract,confirmations',
        cache: '&objectName',
      },
      updated: null,
    },
  },
  getters: {
    accounts: state => state.accounts,
    registry: state => state.registry,
    accountsInfo: state => state.accountsInfo,
    mappings: state => state.mappings,
    txs: state => state.txs,
    txsInfo: state => state.txsInfo,
    blocks: state => state.blocks,
    functionSelectors: state => state.functionSelectors,
    eventSelectors: state => state.eventSelectors,
    assets: state => state.assets,
    ensMap: state => state.ensMap,
    exchangeRates: state => state.exchangeRates,
    sync: state => state.sync,
    db: state => state.db,
  },
  mutations: {
    setState(state, info) {
      // logInfo("dataModule", "mutations.setState - info: " + JSON.stringify(info, null, 2));
      Vue.set(state, info.name, info.data);
    },
    toggleAccountField(state, info) {
      Vue.set(state.accounts[info.account], info.field, !state.accounts[info.account][info.field]);
      logInfo("dataModule", "mutations.toggleAccountField - accounts[" + info.account + "]." + info.field + " = " + state.accounts[info.account][info.field]);
    },
    setAccountField(state, info) {
      Vue.set(state.accounts[info.account], info.field, info.value);
      logInfo("dataModule", "mutations.setAccountField - accounts[" + info.account + "]." + info.field + " = " + state.accounts[info.account][info.field]);
    },

    toggleAccountInfoField(state, info) {
      Vue.set(state.accountsInfo[info.account], info.field, !state.accountsInfo[info.account][info.field]);
    },
    setAccountInfoField(state, info) {
      console.log("mutations.setAccountInfoField: " + JSON.stringify(info));
      console.log("state.accountsInfo: " + JSON.stringify(state.accountsInfo, null, 2));
      if (!(info.account in state.accountsInfo)) {
        Vue.set(state.accountsInfo, info.account, {});
      }
      console.log("state.accountsInfo[info.account]: " + JSON.stringify(state.accountsInfo[info.account], null, 2));
      Vue.set(state.accountsInfo[info.account], info.field, info.value);
    },
    addNewAccountInfo(state, info) {
      logInfo("dataModule", "mutations.addNewAccountInfo(" + JSON.stringify(info) + ")");
      if (!(info.account in state.accountsInfo)) {
        Vue.set(state.accountsInfo, info.account, {
          type: info.type || null,
          group: info.group || null,
          name: info.name || null,
          symbol: info.symbol || null,
          decimals: info.decimals || null,
          slug: info.slug || null,
          image: info.image || null,
          mine: info.mine || null,
          sync: info.sync || null,
          report: info.report || null,
          junk: info.junk || null,
          tags: info.tags || [],
          notes: info.notes || null,
        });
      }
    },
    addNewAccount(state, newAccount) {
      logInfo("dataModule", "mutations.addNewAccount(" + JSON.stringify(newAccount, null, 2) + ")");
      const address = newAccount.action == "addCoinbase" ? store.getters['connection/coinbase'] : (newAccount.action == "addAddress" ? ethers.utils.getAddress(newAccount.address) : newAccount.stealthMetaAddress);
      const type = (newAccount.action == "addCoinbase" || newAccount.action == "addAddress") ? "address" : "stealthMetaAddress";
      const linkedToAddress = (newAccount.action == "addStealthMetaAddress" || newAccount.action == "generateStealthMetaAddress") ? newAccount.linkedToAddress : undefined;
      const source = (newAccount.action == "addCoinbase" || newAccount.action == "generateStealthMetaAddress") ? "attached" : "manual";
      const mine = (newAccount.action == "addCoinbase" || newAccount.action == "generateStealthMetaAddress") ? true : newAccount.mine;
      // const block = store.getters['connection/block'];
      if (address in state.accounts) {
        Vue.set(state.accounts[address], 'type', type);
        if (type == "stealthMetaAddress") {
          Vue.set(state.accounts[address], 'linkedToAddress', linkedToAddress);
          Vue.set(state.accounts[address], 'phrase', newAccount.action == "generateStealthMetaAddress" ? newAccount.phrase : undefined);
          Vue.set(state.accounts[address], 'viewingPrivateKey', newAccount.action == "generateStealthMetaAddress" ? newAccount.viewingPrivateKey : undefined);
          Vue.set(state.accounts[address], 'spendingPublicKey', newAccount.action == "generateStealthMetaAddress" ? newAccount.spendingPublicKey : undefined);
          Vue.set(state.accounts[address], 'viewingPublicKey', newAccount.action == "generateStealthMetaAddress" ? newAccount.viewingPublicKey : undefined);
        }
        Vue.set(state.accounts[address], 'mine', mine);
        Vue.set(state.accounts[address], 'favourite', newAccount.favourite);
        Vue.set(state.accounts[address], 'name', newAccount.name);
      } else {
        if (type == "address") {
          Vue.set(state.accounts, address, {
            type,
            source,
            mine,
            favourite: newAccount.favourite,
            name: newAccount.name,
            notes: null,
          });
        } else {
          Vue.set(state.accounts, address, {
            type,
            linkedToAddress,
            phrase: newAccount.action == "generateStealthMetaAddress" ? newAccount.phrase : undefined,
            viewingPrivateKey: newAccount.action == "generateStealthMetaAddress" ? newAccount.viewingPrivateKey : undefined,
            spendingPublicKey: newAccount.action == "generateStealthMetaAddress" ? newAccount.spendingPublicKey : undefined,
            viewingPublicKey: newAccount.action == "generateStealthMetaAddress" ? newAccount.viewingPublicKey : undefined,
            source,
            mine,
            favourite: newAccount.favourite,
            name: newAccount.name,
            notes: null,
          });
        }

        // Vue.set(state.accounts, address, {
        //   type,
        //   source,
        //   mine,
        //   name,
      //     type: info.type || null,
      //     name: info.name || null, // ERC-20, ERC-721 & ERC-1155
      //     ensName: null,
      //     symbol: info.symbol || null, // ERC-20, ERC-721 & ERC-1155
      //     decimals: info.decimals || null, // ERC-20
      //     slug: info.slug || null, // ERC-721 & ERC-1155
      //     image: info.image || null, // ?ERC-20, ERC-721 & ERC-1155
      //     created: {
      //       timestamp: block && block.timestamp || null,
      //       blockNumber: block && block.number || null,
      //     },
      //     updated: {
      //       timestamp: null,
      //       blockNumber: null,
      //     },
      //     transactions: {},
      //     internalTransactions: {},
      //     events: {},
      //     assets: {},
        // });
      }
      logInfo("dataModule", "mutations.addNewAccount AFTER - state.accounts: " + JSON.stringify(state.accounts, null, 2));
    },
    deleteAccountAndAccountInfo(state, account) {
      Vue.delete(state.accounts, account);
      Vue.delete(state.accountsInfo, account);
    },
    addAccountEvent(state, info) {
      const [account, eventRecord] = [info.account, info.eventRecord];
      const accountData = state.accounts[account];
      if (!(eventRecord.txHash in accountData.events)) {
        accountData.events[eventRecord.txHash] = eventRecord.blockNumber;
      }
    },
    addAccountInternalTransactions(state, info) {
      const [account, results] = [info.account, info.results];
      const accountData = state.accounts[account];
      const groupByHashes = {};
      for (const result of results) {
        if (!(result.hash in accountData.internalTransactions)) {
          if (!(result.hash in groupByHashes)) {
            groupByHashes[result.hash] = [];
          }
          groupByHashes[result.hash].push(result);
        }
      }
      for (const [txHash, results] of Object.entries(groupByHashes)) {
        for (let resultIndex in results) {
          const result = results[resultIndex];
          if (!(txHash in accountData.internalTransactions)) {
            accountData.internalTransactions[txHash] = {};
          }
          accountData.internalTransactions[txHash][resultIndex] = { ...result, hash: undefined };
        }
      }
    },
    addAccountTransactions(state, info) {
      const [account, results] = [info.account, info.results];
      const accountData = state.accounts[account];
      for (const result of results) {
        if (!(result.hash in accountData.transactions)) {
          accountData.transactions[result.hash] = result.blockNumber;
        }
      }
    },
    updateAccountTimestampAndBlock(state, info) {
      const [account, events] = [info.account, info.events];
      Vue.set(state.accounts[account], 'updated', {
        timestamp: info.timestamp,
        blockNumber: info.blockNumber,
      });
    },
    addAccountToken(state, token) {
      const contract = ethers.utils.getAddress(token.contract);
      const contractData = state.accounts[contract];
      if (!(token.tokenId in contractData.assets)) {
        Vue.set(state.accounts[contract].assets, token.tokenId, {
          name: token.name,
          description: token.description,
          image: token.image,
          type: token.kind,
          isFlagged: token.isFlagged,
          events: {},
        });
      }
    },
    updateAccountToken(state, token) {
      const contract = ethers.utils.getAddress(token.contract);
      const contractData = state.accounts[contract] || {};
      if (token.tokenId in contractData.assets) {
        const newData = {
          ...state.accounts[contract].assets[token.tokenId],
          name: token.name,
          description: token.description,
          image: token.image,
          type: token.kind,
          isFlagged: token.isFlagged,
        };
        Vue.set(state.accounts[contract].assets, token.tokenId, newData);
      }
    },
    addAccountERC20Transfers(state, transfer) {
      const contract = ethers.utils.getAddress(transfer.contract);
      const contractData = state.accounts[contract];
      if (!(transfer.txHash in contractData.erc20transfers)) {
        Vue.set(state.accounts[contract].erc20transfers, transfer.txHash, {});
      }
      if (!(transfer.logIndex in state.accounts[contract].erc20transfers[transfer.txHash])) {
        const tempTransfer = { ...transfer, txHash: undefined, logIndex: undefined };
        Vue.set(state.accounts[contract].erc20transfers[transfer.txHash], transfer.logIndex, tempTransfer);
      }
    },
    addAccountTokenEvents(state, info) {
      console.log("addAccountTokenEvents: " + info.txHash + " " + JSON.stringify(info.events, null, 2));
      for (const [eventIndex, event] of info.events.entries()) {
        // console.log("  " + eventIndex + " " + event.type + " " + event.contract + " " + event.tokenId + " " + JSON.stringify(event));
        if (event.type == 'preerc721' || event.type == 'erc721' || event.type == 'erc1155') {
          const contractData = state.accounts[event.contract] || {};
          // console.log("contractData: " + JSON.stringify(contractData, null, 2));
          // console.log("contractData.assets[event.tokenId]: " + JSON.stringify(contractData.assets[event.tokenId], null, 2));
          if (contractData.assets[event.tokenId]) {
            if (!(info.txHash in contractData.assets[event.tokenId].events)) {
              Vue.set(state.accounts[event.contract].assets[event.tokenId].events, info.txHash, {
                blockNumber: info.blockNumber,
                transactionIndex: info.transactionIndex,
                timestamp: info.timestamp,
                logs: {},
              });
            }
            if (!(event.logIndex in state.accounts[event.contract].assets[event.tokenId].events[info.txHash].logs)) {
              Vue.set(state.accounts[event.contract].assets[event.tokenId].events[info.txHash].logs, event.logIndex, {
                // txHash: info.txHash,
                action: event.action || undefined,
                type: event.type || undefined,
                from: event.from || undefined,
                to: event.to || undefined,
                price: event.price || undefined,
              });
            }
            // console.log("contractData.assets[event.tokenId]: " + JSON.stringify(contractData.assets[event.tokenId], null, 2));
          }
          // console.log(txHash + " " + eventItem.type + " " + eventItem.contract + " " + (tokenContract ? tokenContract.type : '') + " " + (tokenContract ? tokenContract.name : '') + " " + (eventItem.tokenId ? eventItem.tokenId : '?'));
        }
      }
    },
    resetTokens(state) {
      for (const [account, accountData] of Object.entries(state.accounts)) {
        if (['preerc721', 'erc721', 'erc1155'].includes(accountData.type)) {
          Vue.set(state.accounts[account], 'assets', {});
        }
      }
    },
    addBlock(state, info) {
      const [blockNumber, timestamp, account, asset, balance] = [info.blockNumber, info.timestamp, info.account, info.asset, info.balance];
      if (!(blockNumber in state.blocks)) {
        Vue.set(state.blocks, blockNumber, {
          timestamp,
          balances: {},
        });
      }
      if (!(account in state.blocks[blockNumber].balances)) {
        Vue.set(state.blocks[blockNumber].balances, account, {});
      }
      if (!(asset in state.blocks[blockNumber].balances[account])) {
        Vue.set(state.blocks[blockNumber].balances[account], asset, balance);
      }
    },
    addNewFunctionSelectors(state, functionSelectors) {
      for (const [functionSelector, functionNames] of Object.entries(functionSelectors)) {
        if (!(functionSelector in state.functionSelectors)) {
          Vue.set(state.functionSelectors, functionSelector, functionNames.map(e => e.name));
        }
      }
    },
    addNewEventSelectors(state, eventSelectors) {
      for (const [eventSelector, eventNames] of Object.entries(eventSelectors)) {
        if (!(eventSelector in state.eventSelectors)) {
          Vue.set(state.eventSelectors, eventSelector, eventNames.map(e => e.name));
        }
      }
    },
    addENSName(state, nameInfo) {
      Vue.set(state.ensMap, nameInfo.account, nameInfo.name);
    },
    addTxs(state, info) {
      Vue.set(state.txs, info.txHash, info.txInfo);
    },
    // updateTxData(state, info) {
    //   Vue.set(state.txs[info.txHash].dataImported, 'tx', {
    //     hash: info.tx.hash,
    //     type: info.tx.type,
    //     blockHash: info.tx.blockHash,
    //     blockNumber: info.tx.blockNumber,
    //     transactionIndex: info.tx.transactionIndex,
    //     from: info.tx.from,
    //     gasPrice: info.tx.gasPrice,
    //     gasLimit: info.tx.gasLimit,
    //     to: info.tx.to,
    //     value: info.tx.value,
    //     nonce: info.tx.nonce,
    //     data: info.tx.data,
    //     r: info.tx.r,
    //     s: info.tx.s,
    //     v: info.tx.v,
    //     chainId: info.tx.chainId,
    //   });
    //   Vue.set(state.txs[info.txHash].dataImported, 'txReceipt', info.txReceipt);
    //   Vue.set(state.txs[info.txHash].computed.info, 'summary', info.summary);
    // },
    setExchangeRates(state, exchangeRates) {
      // const dates = Object.keys(exchangeRates);
      // dates.sort();
      // for (let date of dates) {
      //   console.log(date + "\t" + exchangeRates[date]);
      // }
      Vue.set(state, 'exchangeRates', exchangeRates);
    },
    saveTxTags(state, info) {
      if (!(info.txHash in state.txsInfo)) {
        Vue.set(state.txsInfo, info.txHash, {
          tags: info.tags,
        });
      } else {
        Vue.set(state.txsInfo[info.txHash], 'tags', info.tags);
      }
    },
    addTagToTxs(state, info) {
      for (const txHash of Object.keys(info.txHashes)) {
        if (!(txHash in state.txsInfo)) {
          Vue.set(state.txsInfo, txHash, {
            tags: [info.tag],
          });
        } else {
          const currentTags = state.txsInfo[txHash].tags || [];
          if (!currentTags.includes(info.tag)) {
            currentTags.push(info.tag);
            Vue.set(state.txsInfo[txHash], 'tags', currentTags);
          }
        }
      }
    },
    removeTagFromTxs(state, info) {
      for (const txHash of Object.keys(info.txHashes)) {
        if (txHash in state.txsInfo) {
          const currentTags = state.txsInfo[txHash].tags || [];
          if (currentTags.includes(info.tag)) {
            const newTags = currentTags.filter(e => e != info.tag);
            if (newTags.length == 0 && Object.keys(state.txsInfo[txHash]).length == 1) {
              Vue.delete(state.txsInfo, txHash);
            } else {
              Vue.set(state.txsInfo[txHash], 'tags', newTags);
            }
          }
        }
      }
    },
    setSyncSection(state, info) {
      state.sync.section = info.section;
      state.sync.total = info.total;
    },
    setSyncCompleted(state, completed) {
      state.sync.completed = completed;
    },
    setSyncHalt(state, halt) {
      state.sync.halt = halt;
    },
  },
  actions: {
    async restoreState(context) {
      logInfo("dataModule", "actions.restoreState");
      const CHAIN_ID = 1;
      if (Object.keys(context.state.txs) == 0) {
        const db0 = new Dexie(context.state.db.name);
        db0.version(context.state.db.version).stores(context.state.db.schemaDefinition);
        for (let type of ['accounts', 'registry', 'ensMap', 'exchangeRates']) {
          const data = await db0.cache.where("objectName").equals(CHAIN_ID + '.' + type).toArray();
          if (data.length == 1) {
            logInfo("dataModule", "actions.restoreState " + type + " => " + JSON.stringify(data[0].object));
            context.commit('setState', { name: type, data: data[0].object });
          }
        }
      }
    },
    async saveData(context, types) {
      const CHAIN_ID = 1;
      const db0 = new Dexie(context.state.db.name);
      db0.version(context.state.db.version).stores(context.state.db.schemaDefinition);
      for (let type of types) {
        await db0.cache.put({ objectName: CHAIN_ID + '.' + type, object: context.state[type] }).then (function() {
        }).catch(function(error) {
          console.log("error: " + error);
        });
      }
      db0.close();
    },

    async toggleAccountField(context, info) {
      // logInfo("dataModule", "actions.toggleAccountField - info: " + JSON.stringify(info));
      await context.commit('toggleAccountField', info);
      await context.dispatch('saveData', ['accounts']);
    },
    async setAccountField(context, info) {
      // logInfo("dataModule", "actions.setAccountField - info: " + JSON.stringify(info));
      await context.commit('setAccountField', info);
      await context.dispatch('saveData', ['accounts']);
    },

    async toggleAccountInfoField(context, info) {
      await context.commit('toggleAccountInfoField', info);
      await context.dispatch('saveData', ['accounts', 'accountsInfo']);
    },
    async setAccountInfoField(context, info) {
      await context.commit('setAccountInfoField', info);
      await context.dispatch('saveData', ['accounts', 'accountsInfo']);
    },
    async deleteAccountAndAccountInfo(context, account) {
      await context.commit('deleteAccountAndAccountInfo', account);
      await context.dispatch('saveData', ['accounts', 'accountsInfo']);
    },
    async saveTxTags(context, info) {
      await context.commit('saveTxTags', info);
      await context.dispatch('saveData', ['txsInfo']);
    },
    async addTagToTxs(context, info) {
      await context.commit('addTagToTxs', info);
      await context.dispatch('saveData', ['txsInfo']);
    },
    async removeTagFromTxs(context, info) {
      await context.commit('removeTagFromTxs', info);
      await context.dispatch('saveData', ['txsInfo']);
    },
    async refreshTokenMetadata(context, token) {
      console.log("actions.refreshTokenMetadata - token: " + JSON.stringify(token));
      const url = "https://api.reservoir.tools/tokens/v5?tokens=" + token.contract + ":" + token.tokenId;
      console.log(url);
      const data = await fetch(url).then(response => response.json());
      if (data.tokens) {
        for (let record of data.tokens) {
          context.commit('updateAccountToken', record.token);
        }
      }
      await context.dispatch('saveData', ['accounts']);
    },
    async setSyncHalt(context, halt) {
      context.commit('setSyncHalt', halt);
    },
    async resetTokens(context) {
      await context.commit('resetTokens');
      await context.dispatch('saveData', ['accounts']);
    },
    async resetData(context, section) {
      const CHAIN_ID = 1;
      console.log("data.actions.resetData - section: " + section);
      // TODO: Handle "report"
      context.commit('setState', { name: section, data: {} });
      const db0 = new Dexie(context.state.db.name);
      db0.version(context.state.db.version).stores(context.state.db.schemaDefinition);
      const status = await db0.cache.where("objectName").equals(CHAIN_ID + '.' + section).delete();
      console.log("status: " + JSON.stringify(status));
      db0.close();
    },
    async addNewAccount(context, newAccount) {
      logInfo("dataModule", "actions.addNewAccount - newAccount: " + JSON.stringify(newAccount, null, 2) + ")");
      context.commit('addNewAccount', newAccount);
      await context.dispatch('saveData', ['accounts']);
      // const accounts = newAccounts == null ? [] : newAccounts.split(/[, \t\n]+/).filter(name => (name.length == 42 && name.substring(0, 2) == '0x'));
      // const provider = new ethers.providers.Web3Provider(window.ethereum);
      // const ensReverseRecordsContract = new ethers.Contract(ENSREVERSERECORDSADDRESS, ENSREVERSERECORDSABI, provider);
      // for (let account of accounts) {
      //   const accountData = await getAccountInfo(account, provider);
      //   if (accountData.account) {
      //     context.commit('addNewAccount', accountData);
      //     const isMyAccount = true; // account == store.getters['connection/coinbase'];
      //     const accountInfo = {
      //       account,
      //       mine: isMyAccount,
      //       sync: isMyAccount,
      //       report: isMyAccount,
      //     };
      //     context.commit('addNewAccountInfo', accountInfo);
      //   }
      //   // const names = await ensReverseRecordsContract.getNames([account]);
      //   // const name = names.length == 1 ? names[0] : account;
      //   // if (!(account in context.state.ensMap)) {
      //   //   context.commit('addENSName', { account, name });
      //   // }
      // }
      // context.dispatch('saveData', ['accountsInfo', 'accounts', 'ensMap']);
    },
    async restoreAccount(context, accountData) {
      logInfo("dataModule", "actions.restoreAccount - accountData: " + JSON.stringify(accountData));
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const ensReverseRecordsContract = new ethers.Contract(ENSREVERSERECORDSADDRESS, ENSREVERSERECORDSABI, provider);
      const accountInfo = await getAccountInfo(accountData.account, provider)
      if (accountInfo.account) {
        context.commit('addNewAccount', accountInfo);
        context.commit('addNewAccountInfo', accountData);
      }
      const names = await ensReverseRecordsContract.getNames([accountData.account]);
      const name = names.length == 1 ? names[0] : accountData.account;
      if (!(accountData.account in context.state.ensMap)) {
        context.commit('addENSName', { account: accountData.account, name });
      }
    },
    async restoreIntermediateData(context, info) {
      if (info.blocks && info.txs) {
        await context.commit('setState', { name: 'blocks', data: info.blocks });
        await context.commit('setState', { name: 'txs', data: info.txs });
      }
    },
    async syncIt(context, info) {
      logInfo("dataModule", "actions.syncIt - sections: " + JSON.stringify(info.sections) + ", parameters: " + JSON.stringify(info.parameters).substring(0, 1000));
      // const db = new Dexie(context.state.db.name);
      // db.version(context.state.db.version).stores(context.state.db.schemaDefinition);
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const block = await provider.getBlock();
      const confirmations = store.getters['config/settings'].confirmations && parseInt(store.getters['config/settings'].confirmations) || 10;
      const confirmedBlockNumber = block && block.number && (block.number - confirmations) || null;
      const confirmedBlock = await provider.getBlock(confirmedBlockNumber);
      const confirmedTimestamp = confirmedBlock && confirmedBlock.timestamp || null;
      const etherscanAPIKey = store.getters['config/settings'].etherscanAPIKey && store.getters['config/settings'].etherscanAPIKey.length > 0 && store.getters['config/settings'].etherscanAPIKey || "YourApiKeyToken";
      const cryptoCompareAPIKey = store.getters['config/settings'].cryptoCompareAPIKey && store.getters['config/settings'].cryptoCompareAPIKey.length > 0 && store.getters['config/settings'].cryptoCompareAPIKey || null;
      const etherscanBatchSize = store.getters['config/settings'].etherscanBatchSize && parseInt(store.getters['config/settings'].etherscanBatchSize) || 5_000_000;
      const OVERLAPBLOCKS = 10000;
      const processFilters = store.getters['config/processFilters'];

      const accountsToSync = [];
      for (const [account, accountData] of Object.entries(context.state.accounts)) {
        const accountsInfo = context.state.accountsInfo[account] || {};
        if ((info.parameters.length == 0 && accountsInfo.sync) || info.parameters.includes(account)) {
            accountsToSync.push(account);
        }
      }
      const chainId = store.getters['connection/chainId'];
      const coinbase = store.getters['connection/coinbase'];
      for (const [sectionIndex, section] of info.sections.entries()) {
        logInfo("dataModule", "actions.syncIt: " + sectionIndex + "." + section);
        const parameter = { chainId, coinbase, accountsToSync, confirmedBlockNumber, confirmedTimestamp, etherscanAPIKey, cryptoCompareAPIKey, etherscanBatchSize, OVERLAPBLOCKS, processFilters };

        if (section == "syncAnnouncements" || section == "all") {
          await context.dispatch('syncAnnouncements', parameter);
        }
        if (section == "syncRegistrations" || section == "all") {
          await context.dispatch('syncRegistrations', parameter);
        }
        if (section == "syncRegistrationsData" || section == "all") {
          await context.dispatch('syncRegistrationsData', parameter);
        }
        if (section == "collateRegistrations" || section == "all") {
          await context.dispatch('collateRegistrations', parameter);
        }
        if (section == "syncTokens" || section == "all") {
          await context.dispatch('syncTokens', parameter);
        }

        // if (section == "syncTransferEvents" || section == "all") {
        //   await context.dispatch('syncTransferEvents', parameter);
        // }
        // if (section == "syncImportInternalTransactions" || section == "all") {
        //   await context.dispatch('syncImportInternalTransactions', parameter);
        // }
        // if (section == "syncImportTransactions" || section == "all") {
        //   await context.dispatch('syncImportTransactions', parameter);
        // }
        // if (section == "syncBlocksAndBalances" || section == "all") {
        //   await context.dispatch('syncBlocksAndBalances', parameter);
        // }
        // if (section == "syncTransactions" || section == "all") {
        //   await context.dispatch('syncTransactions', parameter);
        // }
        // if (section == "syncFunctionSelectors" || section == "all") {
        //   await context.dispatch('syncFunctionSelectors', parameter);
        // }
        // if (section == "syncEventSelectors" || section == "all") {
        //   await context.dispatch('syncEventSelectors', parameter);
        // }
        // if (section == "syncBuildTokenContractsAndAccounts" || section == "all") {
        //   await context.dispatch('syncBuildTokenContractsAndAccounts', parameter);
        // }
        // if (section == "syncBuildTokens" || section == "all") {
        //   await context.dispatch('syncBuildTokens', parameter);
        // }
        // if (section == "syncBuildTokenEvents" || section == "all") {
        //   await context.dispatch('syncBuildTokenEvents', parameter);
        // }
        if (section == "syncImportExchangeRates" || section == "all") {
          await context.dispatch('syncImportExchangeRates', parameter);
        }
        if (section == "syncRefreshENS" || section == "all") {
          await context.dispatch('syncRefreshENS', parameter);
        }
      }
      context.dispatch('saveData', ['accounts', 'accountsInfo', 'blocks', 'txs', 'ensMap']);
      context.commit('setSyncSection', { section: null, total: null });
      context.commit('setSyncHalt', false);
    },
    async syncAnnouncements(context, parameter) {
      logInfo("dataModule", "actions.syncAnnouncements BEGIN: " + JSON.stringify(parameter));
      const db = new Dexie(context.state.db.name);
      db.version(context.state.db.version).stores(context.state.db.schemaDefinition);
      const provider = new ethers.providers.Web3Provider(window.ethereum);

      // Announcement (index_topic_1 uint256 schemeId, index_topic_2 address stealthAddress, index_topic_3 address caller, bytes ephemeralPublicKey, bytes metadata)
      // 0x5f0eab8057630ba7676c49b4f21a0231414e79474595be8e4c432fbf6bf0f4e7
      const erc5564AnnouncerContract = new ethers.Contract(ERC5564ANNOUNCERADDRESS_SEPOLIA, ERC5564ANNOUNCERABI_SEPOLIA, provider);
      let total = 0;
      let t = this;
      async function processLogs(fromBlock, toBlock, selectedContracts, selectedCallers, logs) {
        total = parseInt(total) + logs.length;

        logInfo("dataModule", "actions.syncAnnouncements.processLogs: " + fromBlock + " - " + toBlock + " " + logs.length + " " + total);
        const records = [];
        for (const log of logs) {
          if (!log.removed) {
            // console.log(JSON.stringify(log, null, 2));
            const logData = erc5564AnnouncerContract.interface.parseLog(log);
            const contract = log.address;
            const caller = logData.args[2];
            // if (selectedContracts.includes(contract) && selectedCallers.includes(caller)) {
              // console.log("  Processing: " + JSON.stringify(log));
              const transfers = [];
              const metadata = logData.args[4];
              let segment = 0;
              let part;
              do {
                part = metadata.substring(4 + (segment * 112), 4 + (segment * 112) + 112);
                if (part.length == 112) {
                  const functionSelector = "0x" + part.substring(0, 8);
                  const token = ethers.utils.getAddress("0x" + part.substring(8, 48));
                  const valueString = part.substring(48, 112)
                  const value = ethers.BigNumber.from("0x" + valueString).toString();
                  transfers.push({ functionSelector, token, value });
                }
                segment++;
              } while (part.length == 112);
              records.push( {
                chainId: parameter.chainId,
                blockNumber: parseInt(log.blockNumber),
                logIndex: parseInt(log.logIndex),
                txIndex: parseInt(log.transactionIndex),
                txHash: log.transactionHash,
                contract,
                name: logData.name,
                schemeId: parseInt(logData.args[0]),
                stealthAddress: logData.args[1],
                linkedTo: {
                  stealthMetaAddress: null,
                  address: null,
                },
                caller,
                ephemeralPublicKey: logData.args[3],
                metadata: logData.args[4],
                transfers,
                confirmations: parameter.confirmedBlockNumber - log.blockNumber,
                timestamp: null,
                tx: null,
              });
            // }
          }
        }
        // console.log("records: " + JSON.stringify(records, null, 2));
        if (records.length) {
          await db.announcements.bulkPut(records).then (function() {
          }).catch(function(error) {
            console.log("syncAnnouncements.bulkPut error: " + error);
          });
        }
      }
      async function getLogs(fromBlock, toBlock, selectedContracts, selectedCallers, processLogs) {
        logInfo("dataModule", "actions.syncAnnouncements.getLogs: " + fromBlock + " - " + toBlock);
        try {
          const filter = {
            address: null,
            fromBlock,
            toBlock,
            topics: [
              '0x5f0eab8057630ba7676c49b4f21a0231414e79474595be8e4c432fbf6bf0f4e7',
              null,
              null
            ]
          };
          const eventLogs = await provider.getLogs(filter);
          await processLogs(fromBlock, toBlock, selectedContracts, selectedCallers, eventLogs);
        } catch (e) {
          const mid = parseInt((fromBlock + toBlock) / 2);
          await getLogs(fromBlock, mid, selectedContracts, selectedCallers, processLogs);
          await getLogs(parseInt(mid) + 1, toBlock, selectedContracts, selectedCallers, processLogs);
        }
      }
      logInfo("dataModule", "actions.syncAnnouncements BEGIN");
      // this.sync.completed = 0;
      // this.sync.total = 0;
      // this.sync.section = 'Stealth Address Announcements';
      const selectedContracts = [];
      const selectedCallers = [];
      // for (const [chainId, chainData] of Object.entries(this.contracts)) {
      //   for (const [contract, contractData] of Object.entries(chainData)) {
      //     if (contractData.type == "announcer" && contractData.read) {
      //       selectedContracts.push(contract);
      //     }
      //     if (contractData.type == "caller" && contractData.read) {
      //       selectedCallers.push(contract);
      //     }
      //   }
      // }
      // console.log("selectedCallers: " + JSON.stringify(selectedCallers, null, 2));
      // if (selectedContracts.length > 0) {
        // const deleteCall = await db.announcements.where("confirmations").below(this.CONFIRMATIONS).delete();
        // const latest = await db.announcements.where('[chainId+blockNumber+logIndex]').between([this.chainId, Dexie.minKey, Dexie.minKey],[this.chainId, Dexie.maxKey, Dexie.maxKey]).last();
        // const startBlock = latest ? parseInt(latest.blockNumber) + 1: 0;
        const startBlock = 0;
        await getLogs(startBlock, parameter.confirmedBlockNumber, selectedContracts, selectedCallers, processLogs);
      // }
      logInfo("dataModule", "actions.syncAnnouncements END");
    },

    async syncRegistrations(context, parameter) {
      logInfo("dataModule", "actions.syncRegistrations BEGIN: " + JSON.stringify(parameter));
      const db = new Dexie(context.state.db.name);
      db.version(context.state.db.version).stores(context.state.db.schemaDefinition);
      const provider = new ethers.providers.Web3Provider(window.ethereum);

      // Note: Following is ERC-6538: Stealth Meta-Address Registry with registrant being bytes32 instead of bytes
      // OLD StealthMetaAddressSet (index_topic_1 bytes32 registrant, index_topic_2 uint256 scheme, bytes stealthMetaAddress)
      // OLD 0x0bb4b5456abb9a4e7e0624d821e95e2fcc8a761c9227b5d761ae0da4a3fda233
      // StealthMetaAddressSet (index_topic_1 address registrant, index_topic_2 uint256 scheme, bytes stealthMetaAddress)
      // 0x4e739a47dfa4fd3cfa92f8fe760cebe125565927e5c422cb28e7aa388a067af9
      const erc5564RegistryContract = new ethers.Contract(ERC5564REGISTRYADDRESS_SEPOLIA, ERC5564REGISTRYABI_SEPOLIA, provider);
      let total = 0;
      let t = this;
      async function processLogs(fromBlock, toBlock, selectedContracts, logs) {
        total = parseInt(total) + logs.length;
        logInfo("dataModule", "actions.syncRegistrations.processLogs: " + fromBlock + " - " + toBlock + " " + logs.length + " " + total);
        const records = [];
        for (const log of logs) {
          if (!log.removed) {
            const logData = erc5564RegistryContract.interface.parseLog(log);
            const contract = log.address;
            // if (selectedContracts.includes(contract)) {
              records.push( {
                chainId: parameter.chainId,
                blockNumber: parseInt(log.blockNumber),
                logIndex: parseInt(log.logIndex),
                txIndex: parseInt(log.transactionIndex),
                txHash: log.transactionHash,
                contract,
                name: logData.name,
                registrant: ethers.utils.getAddress(logData.args[0]),
                schemeId: parseInt(logData.args[1]),
                stealthMetaAddress: ethers.utils.toUtf8String(logData.args[2]),
                mine: false,
                confirmations: parameter.confirmedBlockNumber - log.blockNumber,
                timestamp: null,
                tx: null,
              });
            // }
          }
        }
        if (records.length) {
          await db.registrations.bulkPut(records).then (function() {
          }).catch(function(error) {
            console.log("syncRegistrations.bulkPut error: " + error);
          });
        }
      }
      async function getLogs(fromBlock, toBlock, selectedContracts, processLogs) {
        logInfo("dataModule", "actions.syncRegistrations.getLogs: " + fromBlock + " - " + toBlock);
        try {
          const filter = {
            address: null,
            fromBlock,
            toBlock,
            topics: [
              '0x4e739a47dfa4fd3cfa92f8fe760cebe125565927e5c422cb28e7aa388a067af9',
              null,
              null
            ]
          };
          const eventLogs = await provider.getLogs(filter);
          await processLogs(fromBlock, toBlock, selectedContracts, eventLogs);
        } catch (e) {
          const mid = parseInt((fromBlock + toBlock) / 2);
          await getLogs(fromBlock, mid, selectedContracts, processLogs);
          await getLogs(parseInt(mid) + 1, toBlock, selectedContracts, processLogs);
        }
      }
      logInfo("dataModule", "actions.syncRegistrations BEGIN");
      // this.sync.completed = 0;
      // this.sync.total = 0;
      // this.sync.section = 'Stealth Address Registry';
      const selectedContracts = [];
      // for (const [chainId, chainData] of Object.entries(this.contracts)) {
      //   for (const [contract, contractData] of Object.entries(chainData)) {
      //     if (contractData.type == "registry" && contractData.read) {
      //       selectedContracts.push(contract);
      //     }
      //   }
      // }
      // if (selectedContracts.length > 0) {
        // const deleteCall = await db.registrations.where("confirmations").below(this.CONFIRMATIONS).delete();
        // const latest = await db.registrations.where('[chainId+blockNumber+logIndex]').between([this.chainId, Dexie.minKey, Dexie.minKey],[this.chainId, Dexie.maxKey, Dexie.maxKey]).last();
        // const startBlock = latest ? parseInt(latest.blockNumber) + 1: 0;
        const startBlock = 0;
        await getLogs(startBlock, parameter.confirmedBlockNumber, selectedContracts, processLogs);
      // }
      logInfo("dataModule", "actions.syncRegistrations END");
    },

    async syncRegistrationsData(context, parameter) {
      const DB_PROCESSING_BATCH_SIZE = 123;
      const chainId = store.getters['connection/chainId'];
      logInfo("dataModule", "actions.syncRegistrationsData: " + JSON.stringify(parameter));
      const db = new Dexie(context.state.db.name);
      db.version(context.state.db.version).stores(context.state.db.schemaDefinition);
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      let rows = 0;
      let done = false;
      do {
        let data = await db.registrations.offset(rows).limit(DB_PROCESSING_BATCH_SIZE).toArray();
        logInfo("dataModule", "actions.syncRegistrationsData - data.length: " + data.length + ", first[0..9]: " + JSON.stringify(data.slice(0, 10).map(e => e.blockNumber + '.' + e.logIndex )));
        rows = parseInt(rows) + data.length;
        done = data.length < DB_PROCESSING_BATCH_SIZE;
        done = true;
      } while (!done);
      const total = rows;
      logInfo("dataModule", "actions.syncRegistrationsData - total: " + total);
      // this.sync.completed = 0;
      // this.sync.total = rows;
      // this.sync.section = 'Registrations Tx Data';
      rows = 0;
      do {
        let data = await db.registrations.offset(rows).limit(DB_PROCESSING_BATCH_SIZE).toArray();
        logInfo("dataModule", "actions.syncRegistrationsData - data.length: " + data.length + ", first[0..9]: " + JSON.stringify(data.slice(0, 10).map(e => e.blockNumber + '.' + e.logIndex )));
        const records = [];
        for (const item of data) {
          // console.log(moment().format("HH:mm:ss") + " syncRegistrationsData: " + JSON.stringify(item));
          if (item.timestamp == null && item.chainId == chainId) {
            const block = await provider.getBlock(item.blockNumber);
            item.timestamp = block.timestamp;
            const tx = await provider.getTransaction(item.txHash);
            const txReceipt = await provider.getTransactionReceipt(item.txHash);
            item.tx = {
              type: tx.type,
              blockHash: tx.blockHash,
              from: tx.from,
              gasPrice: ethers.BigNumber.from(tx.gasPrice).toString(),
              gasLimit: ethers.BigNumber.from(tx.gasLimit).toString(),
              to: tx.to,
              value: ethers.BigNumber.from(tx.value).toString(),
              nonce: tx.nonce,
              data: tx.to && tx.data || null, // Remove contract creation data to reduce memory footprint
              chainId: tx.chainId,
              contractAddress: txReceipt.contractAddress,
              transactionIndex: txReceipt.transactionIndex,
              gasUsed: ethers.BigNumber.from(txReceipt.gasUsed).toString(),
              blockHash: txReceipt.blockHash,
              logs: txReceipt.logs,
              cumulativeGasUsed: ethers.BigNumber.from(txReceipt.cumulativeGasUsed).toString(),
              effectiveGasPrice: ethers.BigNumber.from(txReceipt.effectiveGasPrice).toString(),
              status: txReceipt.status,
              type: txReceipt.type,
            };
            records.push(item);
          }
        }
        if (records.length > 0) {
          console.log("records: " + JSON.stringify(records, null, 2));
          await db.registrations.bulkPut(records).then (function() {
          }).catch(function(error) {
            console.log("syncRegistrationsData.bulkPut error: " + error);
          });
        }
        rows = parseInt(rows) + data.length;
        // this.sync.completed = rows;
        done = data.length < DB_PROCESSING_BATCH_SIZE;
      } while (!done);
      logInfo("dataModule", "actions.syncRegistrationsData END");
    },

    async collateRegistrations(context, parameter) {
      const DB_PROCESSING_BATCH_SIZE = 123;
      const chainId = store.getters['connection/chainId'];
      logInfo("dataModule", "actions.collateRegistrations: " + JSON.stringify(parameter));
      const db = new Dexie(context.state.db.name);
      db.version(context.state.db.version).stores(context.state.db.schemaDefinition);
      const provider = new ethers.providers.Web3Provider(window.ethereum);

      const registry = context.state.registry;
      console.log("registry BEFORE: " + JSON.stringify(registry, null, 2));
      let rows = 0;
      let done = false;
      do {
        let data = await db.registrations.offset(rows).limit(DB_PROCESSING_BATCH_SIZE).toArray();
        logInfo("dataModule", "actions.collateRegistrations - data.length: " + data.length + ", first[0..9]: " + JSON.stringify(data.slice(0, 10).map(e => e.blockNumber + '.' + e.logIndex )));
        for (const item of data) {
          // console.log(JSON.stringify(context.state.registry));
          if (item.chainId == chainId && item.schemeId == 0) {
            // logInfo("dataModule", "actions.collateRegistrations - processing: " + JSON.stringify(item, null, 2));
            const stealthMetaAddress = item.stealthMetaAddress.match(/^st:eth:0x[0-9a-fA-F]{132}$/) ? item.stealthMetaAddress : STEALTHMETAADDRESS0;
            // logInfo("dataModule", "actions.collateRegistrations - registrant: " + item.registrant + ", stealthMetaAddress: " + item.stealthMetaAddress + " => " + stealthMetaAddress);
            registry[item.registrant] = stealthMetaAddress;
          }
        }
        rows = parseInt(rows) + data.length;
        done = data.length < DB_PROCESSING_BATCH_SIZE;
        done = true;
      } while (!done);
      console.log("registry AFTER: " + JSON.stringify(registry, null, 2));
      context.commit('setState', { name: 'registry', data: registry });

      console.log("context.state.registry: " + JSON.stringify(context.state.registry, null, 2));
      await context.dispatch('saveData', ['registry']);
      logInfo("dataModule", "actions.collateRegistrations END");
    },

    async syncTokens(context, parameter) {
      logInfo("dataModule", "actions.syncTokens: " + JSON.stringify(parameter));
      const db = new Dexie(context.state.db.name);
      db.version(context.state.db.version).stores(context.state.db.schemaDefinition);
      const provider = new ethers.providers.Web3Provider(window.ethereum);

      // ERC-20 & ERC-721 Transfer (index_topic_1 address from, index_topic_2 address to, index_topic_3 uint256 id)
      // [ '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', accountAs32Bytes, null ],
      // [ '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', null, accountAs32Bytes ],

      // WETH Deposit (index_topic_1 address dst, uint256 wad)
      // 0xe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c
      // WETH Withdrawal (index_topic_1 address src, uint256 wad)
      // 0x7fcf532c15f0a6db0bd6d0e038bea71d30d808c7d98cb3bf7268a95bf5081b65

      // // ERC-20 Approval (index_topic_1 address owner, index_topic_2 address spender, uint256 value)
      // // 0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925
      // // ERC-721 Approval (index_topic_1 address owner, index_topic_2 address approved, index_topic_3 uint256 tokenId)
      // // 0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925
      // // ERC-721 ApprovalForAll (index_topic_1 address owner, index_topic_2 address operator, bool approved)
      // // 0x17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31
      let total = 0;
      let t = this;
      async function processLogs(fromBlock, toBlock, section, logs) {
        total = parseInt(total) + logs.length;
        logInfo("dataModule", "actions.syncTokens.processLogs: " + fromBlock + " - " + toBlock + " " + section + " " + logs.length + " " + total);
        const records = [];
        for (const log of logs) {
          if (!log.removed) {
            const contract = log.address;
            let eventRecord = null;
            if (log.topics[0] == "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef") {
              let from = null;
              let to = null;
              let tokensOrTokenId = null;
              let tokens = null;
              let tokenId = null;
              if (log.topics.length == 4) {
                from = ethers.utils.getAddress('0x' + log.topics[1].substring(26));
                to = ethers.utils.getAddress('0x' + log.topics[2].substring(26));
                tokensOrTokenId = ethers.BigNumber.from(log.topics[3]).toString();
              } else if (log.topics.length == 3) {
                from = ethers.utils.getAddress('0x' + log.topics[1].substring(26));
                to = ethers.utils.getAddress('0x' + log.topics[2].substring(26));
                tokensOrTokenId = ethers.BigNumber.from(log.data).toString();
              // TODO: Handle 2
              } else if (log.topics.length == 1) {
                from = ethers.utils.getAddress('0x' + log.data.substring(26, 66));
                to = ethers.utils.getAddress('0x' + log.data.substring(90, 130));
                tokensOrTokenId = ethers.BigNumber.from('0x' + log.data.substring(130, 193)).toString();
              }
              if (from) {
                if (log.topics.length == 4) {
                  eventRecord = { type: "Transfer", from, to, tokenId: tokensOrTokenId, eventType: "erc721" };
                } else {
                  eventRecord = { type: "Transfer", from, to, tokens: tokensOrTokenId, eventType: "erc20" };
                }
              }
            } else if (log.topics[0] == "0xe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c") {
              const to = ethers.utils.getAddress('0x' + log.topics[1].substring(26));
              tokens = ethers.BigNumber.from(log.data).toString();
              eventRecord = { type: "Transfer", from: ADDRESS0, to, tokens, eventType: "erc20" };
            } else if (log.topics[0] == "0x7fcf532c15f0a6db0bd6d0e038bea71d30d808c7d98cb3bf7268a95bf5081b65") {
              const from = ethers.utils.getAddress('0x' + log.topics[1].substring(26));
              tokens = ethers.BigNumber.from(log.data).toString();
              eventRecord = { type: "Transfer", from, to: ADDRESS0, tokens, eventType: "erc20" };
            } else if (log.topics[0] == "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925") {
              if (log.topics.length == 4) {
                const owner = ethers.utils.getAddress('0x' + log.topics[1].substring(26));
                const approved = ethers.utils.getAddress('0x' + log.topics[2].substring(26));
                tokenId = ethers.BigNumber.from(log.topics[3]).toString();
                eventRecord = { type: "Approval", owner, approved, tokenId, eventType: "erc721" };
              } else {
                const owner = ethers.utils.getAddress('0x' + log.topics[1].substring(26));
                const spender = ethers.utils.getAddress('0x' + log.topics[2].substring(26));
                tokens = ethers.BigNumber.from(log.data).toString();
                eventRecord = { type: "Approval", owner, spender, tokens, eventType: "erc20" };
              }
            } else if (log.topics[0] == "0x17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31") {
              const owner = ethers.utils.getAddress('0x' + log.topics[1].substring(26));
              const operator = ethers.utils.getAddress('0x' + log.topics[2].substring(26));
              approved = ethers.BigNumber.from(log.data).toString();
              eventRecord = { type: "ApprovalForAll", owner, operator, approved, eventType: "erc721" };
            } else {
              console.log("NOT HANDLED: " + JSON.stringify(log));
            }
            // TODO: Testing if (eventRecord && contract == "0x7439E9Bb6D8a84dd3A23fe621A30F95403F87fB9") {
            if (eventRecord) {
              records.push( {
                chainId: parameter.chainId,
                blockNumber: parseInt(log.blockNumber),
                logIndex: parseInt(log.logIndex),
                txIndex: parseInt(log.transactionIndex),
                txHash: log.transactionHash,
                contract,
                ...eventRecord,
                confirmations: parameter.confirmedBlockNumber - log.blockNumber,
              });
            }
          }
        }
        if (records.length) {
          await db.tokenEvents.bulkPut(records).then (function() {
          }).catch(function(error) {
            console.log("syncTokens.bulkPut error: " + error);
          });
        }
      }
      async function getLogs(fromBlock, toBlock, section, selectedAddresses, processLogs) {
        logInfo("dataModule", "actions.syncTokens.getLogs: " + fromBlock + " - " + toBlock + " " + section);
        try {
          let topics = null;
          if (section == 0) {
            topics = [[
                '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
                '0xe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c',
                '0x7fcf532c15f0a6db0bd6d0e038bea71d30d808c7d98cb3bf7268a95bf5081b65',
                '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925',
                '0x17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31',
              ],
              selectedAddresses,
              null
            ];
          } else if (section == 1) {
            topics = [ ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'], null, selectedAddresses ];
          }
          const logs = await provider.getLogs({ address: null, fromBlock, toBlock, topics });
          await processLogs(fromBlock, toBlock, section, logs);
        } catch (e) {
          const mid = parseInt((fromBlock + toBlock) / 2);
          await getLogs(fromBlock, mid, section, selectedAddresses, processLogs);
          await getLogs(parseInt(mid) + 1, toBlock, section, selectedAddresses, processLogs);
        }
      }
      logInfo("dataModule", "actions.syncTokens BEGIN");

      // this.sync.completed = 0;
      // this.sync.total = 0;
      // this.sync.section = 'ERC-20 & ERC-721 Tokens';
      const selectedAddresses = ['0x000000000000000000000000' + parameter.coinbase.substring(2, 42).toLowerCase()];
      // console.log(selectedAddresses);
      // const selectedAddresses = [];
      // for (const [address, addressData] of Object.entries(this.addresses)) {
      //   if (address.substring(0, 2) == "0x" && addressData.mine) {
      //     selectedAddresses.push('0x000000000000000000000000' + address.substring(2, 42).toLowerCase());
      //   }
      // }
      if (selectedAddresses.length > 0) {
        // const deleteCall = await db.tokenEvents.where("confirmations").below(this.CONFIRMATIONS).delete();
        // const latest = await db.tokenEvents.where('[chainId+blockNumber+logIndex]').between([this.chainId, Dexie.minKey, Dexie.minKey],[this.chainId, Dexie.maxKey, Dexie.maxKey]).last();
        // TODO Dev const startBlock = latest ? parseInt(latest.blockNumber) + 1: 0;
        // TODO Need to rescan when address set changed
        const startBlock = 0;
        // const startBlock = this.settings.sync.rescanTokens ? 0 : (latest ? parseInt(latest.blockNumber) + 1: 0);
        for (let section = 0; section < 2; section++) {
          await getLogs(startBlock, parameter.confirmedBlockNumber, section, selectedAddresses, processLogs);
        }
      }

      logInfo("dataModule", "actions.syncTokens END");
    },

    // async syncTransferEvents(context, parameter) {
    //   logInfo("dataModule", "actions.syncTransferEvents: " + JSON.stringify(parameter));
    //   const provider = new ethers.providers.Web3Provider(window.ethereum);
    //   const interfaces = getInterfaces();
    //   const preERC721s = store.getters['config/settings'].preERC721s;
    //   const BATCHSIZE = parameter.etherscanBatchSize;
    //   // const BATCHSIZE = 50000000;
    //   for (const [accountIndex, account] of parameter.accountsToSync.entries()) {
    //     console.log("actions.syncTransferEvents: " + accountIndex + " " + account);
    //     context.commit('setSyncSection', { section: 'Import', total: parameter.accountsToSync.length });
    //     context.commit('setSyncCompleted', parseInt(accountIndex) + 1);
    //     const accountData = context.state.accounts[account] || {};
    //     const startBlock = accountData && accountData.updated && accountData.updated.blockNumber && (parseInt(accountData.updated.blockNumber) - parameter.OVERLAPBLOCKS) || 0;
    //
    //     context.commit('setSyncSection', { section: 'Transfer Events', total: parameter.accountsToSync.length });
    //     const accountAs32Bytes = '0x000000000000000000000000' + account.substring(2, 42).toLowerCase();
    //     for (let startBatch = startBlock; startBatch < parameter.confirmedBlockNumber; startBatch += BATCHSIZE) {
    //       const endBatch = (parseInt(startBatch) + BATCHSIZE < parameter.confirmedBlockNumber) ? (parseInt(startBatch) + BATCHSIZE) : parameter.confirmedBlockNumber;
    //       const topicsList = [
    //         // Transfer (index_topic_1 address from, index_topic_2 address to, index_topic_3 uint256 id)
    //         [ '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', accountAs32Bytes, null ],
    //         [ '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', null, accountAs32Bytes ],
    //         // ERC-1155 TransferSingle (index_topic_1 address _operator, index_topic_2 address _from, index_topic_3 address _to, uint256 _id, uint256 _value)
    //         [ '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62', null, accountAs32Bytes, null ],
    //         [ '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62', null, null, accountAs32Bytes ],
    //         // ERC-1155 TransferBatch (index_topic_1 address operator, index_topic_2 address from, index_topic_3 address to, uint256[] ids, uint256[] values)
    //         [ '0x4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb', null, accountAs32Bytes, null ],
    //         [ '0x4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb', null, null, accountAs32Bytes ],
    //         // CryptoPunks V1 & V2 - Assign (index_topic_1 address to, uint256 punkIndex)
    //         [ '0x8a0e37b73a0d9c82e205d4d1a3ff3d0b57ce5f4d7bccf6bac03336dc101cb7ba', accountAs32Bytes ],
    //         // TODO: Delete as Transfer events will be picked up
    //         // // CryptoPunks V1 & V2 - PunkTransfer (index_topic_1 address from, index_topic_2 address to, uint256 punkIndex)
    //         // [ '0x05af636b70da6819000c49f85b21fa82081c632069bb626f30932034099107d8', accountAs32Bytes, null ],
    //         // [ '0x05af636b70da6819000c49f85b21fa82081c632069bb626f30932034099107d8', null, accountAs32Bytes ],
    //         // // CryptoPunks V1 & V2 - Too many topics to filter by my accounts PunkBought (index_topic_1 uint256 punkIndex, uint256 value, index_topic_2 address fromAddress, index_topic_3 address toAddress)
    //         // [ '0x58e5d5a525e3b40bc15abaa38b5882678db1ee68befd2f60bafe3a7fd06db9e3', null, null, null ],
    //       ];
    //       for (let topics of topicsList) {
    //         console.log("Web3 event filter #" + startBatch + "-#" + endBatch + ": " + JSON.stringify(topics));
    //         const logs = await provider.getLogs({ address: null, fromBlock: startBatch, toBlock: endBatch, topics });
    //         for (const event of logs) {
    //           if (!event.removed) {
    //             let eventRecord = null;
    //             const [txHash, blockNumber, logIndex, contract]  = [event.transactionHash, event.blockNumber, event.logIndex, event.address];
    //             if (event.topics[0] == "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef") {
    //               let from;
    //               let to;
    //               let tokensOrTokenId;
    //               if (event.topics.length == 4) {
    //                 from = ethers.utils.getAddress('0x' + event.topics[1].substring(26));
    //                 to = ethers.utils.getAddress('0x' + event.topics[2].substring(26));
    //                 tokensOrTokenId = ethers.BigNumber.from(event.topics[3]).toString();
    //               } else if (event.topics.length == 3) {
    //                 from = ethers.utils.getAddress('0x' + event.topics[1].substring(26));
    //                 to = ethers.utils.getAddress('0x' + event.topics[2].substring(26));
    //                 tokensOrTokenId = ethers.BigNumber.from(event.data).toString();
    //               } else if (event.topics.length == 1) {
    //                 from = ethers.utils.getAddress('0x' + event.data.substring(26, 66));
    //                 to = ethers.utils.getAddress('0x' + event.data.substring(90, 130));
    //                 tokensOrTokenId = ethers.BigNumber.from('0x' + event.data.substring(130, 193)).toString();
    //               }
    //               if ((from == account || to == account)) {
    //                 // ERC-721 Transfer, including pre-ERC721s like CryptoPunks, MoonCatRescue, CryptoCats, CryptoVoxels & CryptoKitties
    //                 if (event.topics.length == 4 || event.address in preERC721s) {
    //                   if (event.address in preERC721s) {
    //                     eventRecord = { txHash, blockNumber, logIndex, contract, from, to, type: "preerc721", tokenId: null, tokens: tokensOrTokenId };
    //                   } else {
    //                     eventRecord = { txHash, blockNumber, logIndex, contract, from, to, type: "erc721", tokenId: tokensOrTokenId, tokens: null };
    //                   }
    //                 } else {
    //                   eventRecord = { txHash, blockNumber, logIndex, contract, from, to, type: "erc20", tokenId: null, tokens:tokensOrTokenId };
    //                 }
    //               }
    //               // ERC-1155 TransferSingle (index_topic_1 address _operator, index_topic_2 address _from, index_topic_3 address _to, uint256 _id, uint256 _value)
    //             } else if (event.topics[0] == "0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62") {
    //               const log = interfaces.erc1155.parseLog(event);
    //               const [operator, from, to, tokenId, tokens] = log.args;
    //               eventRecord = { txHash, blockNumber, logIndex, contract, from, to, type: "erc1155", tokenIds: [ethers.BigNumber.from(tokenId).toString()], tokens: [ethers.BigNumber.from(tokens).toString()] };
    //               // ERC-1155 TransferBatch (index_topic_1 address operator, index_topic_2 address from, index_topic_3 address to, uint256[] ids, uint256[] values)
    //             } else if (event.topics[0] == "0x4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb") {
    //               const log = interfaces.erc1155.parseLog(event);
    //               const [operator, from, to, tokenIds, tokens] = log.args;
    //               const formattedTokenIds = tokenIds.map(e => ethers.BigNumber.from(e).toString());
    //               const formattedTokens = tokens.map(e => ethers.BigNumber.from(e).toString());
    //               eventRecord = { txHash, blockNumber, logIndex, contract, from, to, type: "erc1155", tokenIds: formattedTokenIds, tokens: formattedTokens };
    //             // CryptoPunks V1 & V2 - Assign (index_topic_1 address to, uint256 punkIndex)
    //             } else if (event.topics[0] == "0x8a0e37b73a0d9c82e205d4d1a3ff3d0b57ce5f4d7bccf6bac03336dc101cb7ba") {
    //               const log = interfaces.cryptoPunks.parseLog(event);
    //               const [to, tokenId] = log.args;
    //               eventRecord = { txHash, blockNumber, logIndex, contract, from: ADDRESS0, to, type: "preerc721", tokenId: tokenId.toString() };
    //             // CryptoPunks V1 & V2 - PunkTransfer (index_topic_1 address from, index_topic_2 address to, uint256 punkIndex)
    //             } else if (event.topics[0] == "0x05af636b70da6819000c49f85b21fa82081c632069bb626f30932034099107d8") {
    //               const log = interfaces.cryptoPunks.parseLog(event);
    //               const [from, to, tokenId] = log.args;
    //               eventRecord = { txHash, blockNumber, logIndex, contract, from, to, type: "preerc721", tokenId: tokenId.toString() };
    //             // // CryptoPunks V1 & V2 - PunkTransfer (index_topic_1 address from, index_topic_2 address to, uint256 punkIndex)
    //             // } else if (event.topics[0] == "0x05af636b70da6819000c49f85b21fa82081c632069bb626f30932034099107d8") {
    //             //   const log = interfaces.cryptoPunks.parseLog(event);
    //             //   const [from, to, tokenId] = log.args;
    //             //   eventRecord = { txHash, blockNumber, logIndex, contract, from, to, type: "preerc721", tokenId: tokenId.toString() };
    //             // // CryptoPunks V1 & V2 - PunkBought (index_topic_1 uint256 punkIndex, uint256 value, index_topic_2 address fromAddress, index_topic_3 address toAddress)
    //             // } else if (event.topics[0] == "0x58e5d5a525e3b40bc15abaa38b5882678db1ee68befd2f60bafe3a7fd06db9e3") {
    //             //   const log = interfaces.cryptoPunks.parseLog(event);
    //             //   const [tokenId, value, from, to] = log.args;
    //             //   if (from == account || to == account) {
    //             //     eventRecord = { txHash, blockNumber, logIndex, contract, from, to, type: "preerc721", tokenId: tokenId.toString() };
    //             //   }
    //             }
    //             if (eventRecord) {
    //               context.commit('addAccountEvent', { account, eventRecord });
    //             }
    //           }
    //         }
    //       }
    //     }
    //   }
    // },
    // async syncImportInternalTransactions(context, parameter) {
    //   logInfo("dataModule", "actions.syncImportInternalTransactions: " + JSON.stringify(parameter));
    //   let sleepUntil = null;
    //   for (const [accountIndex, account] of parameter.accountsToSync.entries()) {
    //     console.log("actions.syncImportInternalTransactions: " + accountIndex + " " + account);
    //     context.commit('setSyncSection', { section: 'Etherscan Internal Txs', total: parameter.accountsToSync.length });
    //     context.commit('setSyncCompleted', parseInt(accountIndex) + 1);
    //     const accountData = context.state.accounts[account] || {};
    //     const startBlock = accountData && accountData.updated && accountData.updated.blockNumber && (parseInt(accountData.updated.blockNumber) - parameter.OVERLAPBLOCKS) || 0;
    //     for (let startBatch = startBlock; startBatch < parameter.confirmedBlockNumber; startBatch += parameter.etherscanBatchSize) {
    //       const endBatch = (parseInt(startBatch) + parameter.etherscanBatchSize < parameter.confirmedBlockNumber) ? (parseInt(startBatch) + parameter.etherscanBatchSize) : parameter.confirmedBlockNumber;
    //       console.log("batch: " + startBatch + " to " + endBatch + ", sleepUntil: " + (sleepUntil ? moment.unix(sleepUntil).toString() : 'null'));
    //       do {
    //       } while (sleepUntil && sleepUntil > moment().unix());
    //       let importUrl = "https://api.etherscan.io/api?module=account&action=txlistinternal&address=" + account + "&startblock=" + startBatch + "&endblock=" + endBatch + "&page=1&offset=10000&sort=asc&apikey=" + parameter.etherscanAPIKey;
    //       console.log("importUrl: " + importUrl);
    //       const importData = await fetch(importUrl)
    //         .then(handleErrors)
    //         .then(response => response.json())
    //         .catch(function(error) {
    //            console.log("ERROR - processIt: " + error);
    //            // Want to work around API data unavailablity - state.sync.error = true;
    //            return [];
    //         });
    //       if (importData.status == 1) {
    //         context.commit('addAccountInternalTransactions', { account, results: importData.result });
    //         if (importData.message && importData.message.includes("Missing")) {
    //           sleepUntil = parseInt(moment().unix()) + 6;
    //         }
    //         if (context.state.sync.halt) {
    //           break;
    //         }
    //       }
    //     }
    //   }
    // },
    // async syncImportTransactions(context, parameter) {
    //   logInfo("dataModule", "actions.syncImportTransactions: " + JSON.stringify(parameter));
    //   let sleepUntil = null;
    //   for (const [accountIndex, account] of parameter.accountsToSync.entries()) {
    //     console.log("actions.syncImportTransactions: " + accountIndex + " " + account);
    //     context.commit('setSyncSection', { section: 'Etherscan Transactions', total: parameter.accountsToSync.length });
    //     context.commit('setSyncCompleted', parseInt(accountIndex) + 1);
    //     const accountData = context.state.accounts[account] || {};
    //     const startBlock = accountData && accountData.updated && accountData.updated.blockNumber && (parseInt(accountData.updated.blockNumber) - parameter.OVERLAPBLOCKS) || 0;
    //     for (let startBatch = startBlock; startBatch < parameter.confirmedBlockNumber; startBatch += parameter.etherscanBatchSize) {
    //       const endBatch = (parseInt(startBatch) + parameter.etherscanBatchSize < parameter.confirmedBlockNumber) ? (parseInt(startBatch) + parameter.etherscanBatchSize) : parameter.confirmedBlockNumber;
    //       console.log("batch: " + startBatch + " to " + endBatch + ", sleepUntil: " + (sleepUntil ? moment.unix(sleepUntil).toString() : 'null'));
    //       do {
    //       } while (sleepUntil && sleepUntil > moment().unix());
    //       let importUrl = "https://api.etherscan.io/api?module=account&action=txlist&address=" + account + "&startblock=" + startBatch + "&endblock=" + endBatch + "&page=1&offset=10000&sort=asc&apikey=" + parameter.etherscanAPIKey;
    //       console.log("importUrl: " + importUrl);
    //       const importData = await fetch(importUrl)
    //         .then(handleErrors)
    //         .then(response => response.json())
    //         .catch(function(error) {
    //            console.log("ERROR - processIt: " + error);
    //            // Want to work around API data unavailablity - state.sync.error = true;
    //            return [];
    //         });
    //       if (importData.status == 1) {
    //         context.commit('addAccountTransactions', { account, results: importData.result });
    //         if (importData.message && importData.message.includes("Missing")) {
    //           sleepUntil = parseInt(moment().unix()) + 6;
    //         }
    //         if (context.state.sync.halt) {
    //           break;
    //         }
    //       }
    //     }
    //     // TODO Move elsewhere
    //     context.commit('updateAccountTimestampAndBlock', { account, timestamp: parameter.confirmedTimestamp, blockNumber: parameter.confirmedBlockNumber });
    //   }
    // },
    // async syncBlocksAndBalances(context, parameter) {
    //   logInfo("dataModule", "actions.syncBlocksAndBalances: " + JSON.stringify(parameter));
    //   const provider = new ethers.providers.Web3Provider(window.ethereum);
    //   const weth = new ethers.Contract(WETHADDRESS, WETHABI, provider);
    //   for (const [accountIndex, account] of parameter.accountsToSync.entries()) {
    //     console.log("actions.syncBlocksAndBalances: " + accountIndex + " " + account);
    //     const accountData = context.state.accounts[account] || {};
    //     const txHashesByBlocks = getTxHashesByBlocks(account, context.state.accounts, context.state.accountsInfo, parameter.processFilters);
    //     if (!context.state.sync.halt) {
    //       const blockNumbers = [];
    //       for (const [blockNumber, txHashes] of Object.entries(txHashesByBlocks)) {
    //         const existing = context.state.blocks[blockNumber] && context.state.blocks[blockNumber].balances[account] && context.state.blocks[blockNumber].balances[account].eth && (blockNumber < 4719568 || context.state.blocks[blockNumber].balances[account][WETHADDRESS]) || null;
    //         // const existing = context.state.blocks[blockNumber] && context.state.blocks[blockNumber].balances[account] || null;
    //         if (!existing) {
    //           blockNumbers.push(blockNumber);
    //         }
    //       }
    //       context.commit('setSyncSection', { section: 'Blocks & Balances', total: blockNumbers.length });
    //       let getBalances = true;
    //       for (const [index, blockNumber] of blockNumbers.entries()) {
    //         const block = await provider.getBlock(parseInt(blockNumber));
    //         const timestamp = block.timestamp;
    //         console.log((parseInt(index) + 1) + "/" + blockNumbers.length + " Timestamp & Balance: " + blockNumber + " " + moment.unix(timestamp).format("YYYY-MM-DD HH:mm:ss"));
    //         let ethBalance = null;
    //         let wethBalance = null;
    //         // Jan 21 2022 - Metamask returning inpage.js:1 MetaMask - RPC Error: RetryOnEmptyMiddleware - retries exhausted {code: -32603, message: 'RetryOnEmptyMiddleware - retries exhausted', data: {…}}
    //         if (getBalances) {
    //           try {
    //             ethBalance = ethers.BigNumber.from(await provider.getBalance(account, parseInt(blockNumber))).toString();
    //           } catch (e) {
    //             console.log("ERROR: " + e.message.toString());
    //             getBalances = false;
    //           }
    //         }
    //         if (getBalances) {
    //           try {
    //             wethBalance = (parseInt(blockNumber) < 4719568) ? 0 : ethers.BigNumber.from(await weth.balanceOf(account, { blockTag: parseInt(blockNumber) })).toString();
    //           } catch (e) {
    //             console.log("ERROR: " + e.message.toString());
    //             getBalances = false;
    //           }
    //         }
    //         context.commit('addBlock', { blockNumber, timestamp, account, asset: 'eth', balance: ethBalance });
    //         context.commit('addBlock', { blockNumber, timestamp, account, asset: WETHADDRESS, balance: wethBalance });
    //         context.commit('setSyncCompleted', parseInt(index) + 1);
    //         if ((index + 1) % 100 == 0) {
    //           console.log("Saving blocks");
    //           context.dispatch('saveData', ['blocks']);
    //         }
    //         if (context.state.sync.halt) {
    //           break;
    //         }
    //       }
    //       // context.dispatch('saveData', ['blocks']);
    //       // context.commit('setSyncSection', { section: null, total: null });
    //     }
    //   }
    // },
    // async syncTransactions(context, parameter) {
    //   logInfo("dataModule", "actions.syncTransactions: " + JSON.stringify(parameter));
    //   const provider = new ethers.providers.Web3Provider(window.ethereum);
    //   for (const [accountIndex, account] of parameter.accountsToSync.entries()) {
    //     console.log("actions.syncBlocksAndBalances: " + accountIndex + " " + account);
    //     const accountData = context.state.accounts[account] || {};
    //     const blocks = context.state.blocks;
    //     const txHashesByBlocks = getTxHashesByBlocks(account, context.state.accounts, context.state.accountsInfo, parameter.processFilters);
    //     const txHashesToProcess = {};
    //     if (!context.state.sync.halt) {
    //       for (const [blockNumber, txHashes] of Object.entries(txHashesByBlocks)) {
    //         for (const [index, txHash] of Object.keys(txHashes).entries()) {
    //           if (!(txHash in context.state.txs) && !(txHash in txHashesToProcess)) {
    //             txHashesToProcess[txHash] = blockNumber;
    //           }
    //         }
    //       }
    //       let txHashList = Object.keys(txHashesToProcess);
    //       context.commit('setSyncSection', { section: 'Tx & TxReceipts', total: txHashList.length });
    //       let processed = 1;
    //
    //       for (const [blockNumber, txHashes] of Object.entries(txHashesByBlocks)) {
    //         const block = blocks[blockNumber] || null;
    //         for (const [index, txHash] of Object.keys(txHashes).entries()) {
    //           if (txHash in txHashesToProcess) {
    //             context.commit('setSyncCompleted', processed);
    //             console.log(processed + "/" + txHashList.length + " Retrieving " + txHash + " @ " + blockNumber + " " + moment.unix(block.timestamp).format("YYYY-MM-DD HH:mm:ss"));
    //             const currentInfo = context.state.txs[txHash] || {};
    //             const info = await getTxInfo(txHash, currentInfo, account, provider);
    //             context.commit('addTxs', { txHash, txInfo: info});
    //             if (processed % 50 == 0) {
    //               console.log("Saving txs");
    //               context.dispatch('saveData', ['txs']);
    //             }
    //             if (context.state.sync.halt) {
    //               break;
    //             }
    //             processed++;
    //           }
    //         }
    //         if (context.state.sync.halt) {
    //           break;
    //         }
    //       }
    //     }
    //   }
    // },
    // async syncFunctionSelectors(context, parameter) {
    //   logInfo("dataModule", "actions.syncFunctionSelectors: " + JSON.stringify(parameter));
    //   for (const [accountIndex, account] of parameter.accountsToSync.entries()) {
    //     console.log("actions.syncFunctionSelectors: " + accountIndex + " " + account);
    //     const accountData = context.state.accounts[account] || {};
    //     const txHashesByBlocks = getTxHashesByBlocks(account, context.state.accounts, context.state.accountsInfo, parameter.processFilters);
    //     if (!context.state.sync.halt) {
    //       const missingFunctionSelectorsMap = {};
    //       const functionSelectors = context.state.functionSelectors || {};
    //       for (const [blockNumber, txHashes] of Object.entries(txHashesByBlocks)) {
    //         const block = context.state.blocks[blockNumber] || null;
    //         for (const [index, txHash] of Object.keys(txHashes).entries()) {
    //           const txInfo = context.state.txs[txHash] || {};
    //           if (txInfo.tx && txInfo.tx.to != null && txInfo.tx.data.length >= 10) {
    //             const selector = txInfo.tx.data.substring(0, 10);
    //             if (!(selector in functionSelectors) && !(selector in missingFunctionSelectorsMap)) {
    //               missingFunctionSelectorsMap[selector] = true;
    //             }
    //           }
    //         }
    //       }
    //       console.log("missingFunctionSelectorsMap: " + JSON.stringify(missingFunctionSelectorsMap));
    //       const missingFunctionSelectors = Object.keys(missingFunctionSelectorsMap);
    //       const BATCHSIZE = 50;
    //       for (let i = 0; i < missingFunctionSelectors.length; i += BATCHSIZE) {
    //         const batch = missingFunctionSelectors.slice(i, parseInt(i) + BATCHSIZE);
    //         let url = "https://sig.eth.samczsun.com/api/v1/signatures?" + batch.map(e => ("function=" + e)).join("&");
    //         console.log(url);
    //         const data = await fetch(url)
    //           .then(response => response.json())
    //           .catch(function(e) {
    //             console.log("error: " + e);
    //           });
    //         if (data.ok && Object.keys(data.result.function).length > 0) {
    //           context.commit('addNewFunctionSelectors', data.result.function);
    //         }
    //       }
    //       context.dispatch('saveData', ['functionSelectors']);
    //     }
    //   }
    // },
    // async syncEventSelectors(context, parameter) {
    //   logInfo("dataModule", "actions.syncEventSelectors: " + JSON.stringify(parameter));
    //   for (const [accountIndex, account] of parameter.accountsToSync.entries()) {
    //     console.log("actions.syncEventSelectors: " + accountIndex + " " + account);
    //     const accountData = context.state.accounts[account] || {};
    //     const txHashesByBlocks = getTxHashesByBlocks(account, context.state.accounts, context.state.accountsInfo, parameter.processFilters);
    //     if (!context.state.sync.halt) {
    //       const missingEventSelectorsMap = {};
    //       const eventSelectors = context.state.eventSelectors || {};
    //       for (const [blockNumber, txHashes] of Object.entries(txHashesByBlocks)) {
    //         const block = context.state.blocks[blockNumber] || null;
    //         for (const [index, txHash] of Object.keys(txHashes).entries()) {
    //           const txInfo = context.state.txs[txHash] || {};
    //           if ('txReceipt' in txInfo) {
    //             for (const event of txInfo.txReceipt.logs) {
    //               if (!(event.topics[0] in eventSelectors) && !(event.topics[0] in missingEventSelectorsMap)) {
    //                 missingEventSelectorsMap[event.topics[0]] = true;
    //               }
    //             }
    //           }
    //         }
    //       }
    //       console.log("missingEventSelectorsMap: " + JSON.stringify(missingEventSelectorsMap));
    //       const missingEventSelectors = Object.keys(missingEventSelectorsMap);
    //       const BATCHSIZE = 50;
    //       for (let i = 0; i < missingEventSelectors.length; i += BATCHSIZE) {
    //         const batch = missingEventSelectors.slice(i, parseInt(i) + BATCHSIZE);
    //         let url = "https://sig.eth.samczsun.com/api/v1/signatures?" + batch.map(e => ("event=" + e)).join("&");
    //         console.log(url);
    //         const data = await fetch(url)
    //           .then(response => response.json())
    //           .catch(function(e) {
    //             console.log("error: " + e);
    //           });
    //         if (data.ok && Object.keys(data.result.event).length > 0) {
    //           context.commit('addNewEventSelectors', data.result.event);
    //         }
    //       }
    //       context.dispatch('saveData', ['eventSelectors']);
    //     }
    //   }
    // },
    // async syncBuildTokenContractsAndAccounts(context, parameter) {
    //   logInfo("dataModule", "actions.syncBuildTokenContractsAndAccounts: " + JSON.stringify(parameter));
    //   const provider = new ethers.providers.Web3Provider(window.ethereum);
    //   const ensReverseRecordsContract = new ethers.Contract(ENSREVERSERECORDSADDRESS, ENSREVERSERECORDSABI, provider);
    //   const preERC721s = store.getters['config/settings'].preERC721s;
    //   for (const [accountIndex, account] of parameter.accountsToSync.entries()) {
    //     console.log("actions.syncBuildTokenContractsAndAccounts: " + accountIndex + " " + account);
    //     const accountData = context.state.accounts[account] || {};
    //     const txHashesByBlocks = getTxHashesByBlocks(account, context.state.accounts, context.state.accountsInfo, parameter.processFilters);
    //     if (!context.state.sync.halt) {
    //       const missingAccountsMap = {};
    //       const eventSelectors = context.state.eventSelectors || {};
    //       for (const [blockNumber, txHashes] of Object.entries(txHashesByBlocks)) {
    //         for (const [index, txHash] of Object.keys(txHashes).entries()) {
    //           const txData = context.state.txs[txHash] || null;
    //           if (txData != null) {
    //             if (!(txData.tx.from in context.state.accounts) && !(txData.tx.from in missingAccountsMap)) {
    //               missingAccountsMap[txData.tx.from] = true;
    //             }
    //             if (txData.tx.to != null && (!(txData.tx.to in context.state.accounts) && !(txData.tx.to in missingAccountsMap))) {
    //               missingAccountsMap[txData.tx.to] = true;
    //             }
    //             const events = getEvents(account, context.state.accounts, context.state.eventSelectors, preERC721s, txData);
    //             // console.log(blockNumber + " " + txHash + ": " + JSON.stringify(events.myEvents));
    //             // const results = parseTx(chainId, account, accounts, functionSelectors, preERC721s, tx);
    //             for (const [eventIndex, eventItem] of events.myEvents.entries()) {
    //               for (let a of [eventItem.contract, eventItem.from, eventItem.to]) {
    //                 if (!(a in context.state.accounts) && !(a in missingAccountsMap)) {
    //                   missingAccountsMap[a] = true;
    //                 }
    //               }
    //             }
    //           }
    //         }
    //       }
    //       const missingAccounts = Object.keys(missingAccountsMap);
    //       console.log("missingAccounts: " + JSON.stringify(missingAccounts));
    //       context.commit('setSyncSection', { section: 'Token Contract & Accts', total: missingAccounts.length });
    //       for (const [accountItemIndex, accountItem] of missingAccounts.entries()) {
    //         context.commit('setSyncCompleted', parseInt(accountItemIndex) + 1);
    //         console.log((parseInt(accountItemIndex) + 1) + "/" + missingAccounts.length + " Processing " + accountItem);
    //         const accountDataInfo = await getAccountInfo(accountItem, provider);
    //         if (accountDataInfo.account) {
    //           context.commit('addNewAccount', accountDataInfo);
    //           context.commit('addNewAccountInfo', { account: accountDataInfo.account });
    //         }
    //         const names = await ensReverseRecordsContract.getNames([accountItem]);
    //         const name = names.length == 1 ? names[0] : accountItem;
    //         if (!(accountItem in context.state.ensMap)) {
    //           context.commit('addENSName', { account: accountItem, name });
    //         }
    //         if ((accountItemIndex + 1) % 25 == 0) {
    //           console.log("Saving accounts");
    //           context.dispatch('saveData', ['accountsInfo', 'accounts', 'ensMap']);
    //         }
    //         if (context.state.sync.halt) {
    //           break;
    //         }
    //       }
    //     }
    //   }
    // },
    // async syncBuildTokens(context, parameter) {
    //   logInfo("dataModule", "actions.syncBuildTokens: " + JSON.stringify(parameter));
    //   const provider = new ethers.providers.Web3Provider(window.ethereum);
    //   const ensReverseRecordsContract = new ethers.Contract(ENSREVERSERECORDSADDRESS, ENSREVERSERECORDSABI, provider);
    //   const preERC721s = store.getters['config/settings'].preERC721s;
    //   for (const [accountIndex, account] of parameter.accountsToSync.entries()) {
    //     console.log("actions.syncBuildTokens: " + accountIndex + " " + account);
    //     const accountData = context.state.accounts[account] || {};
    //     const txHashesByBlocks = getTxHashesByBlocks(account, context.state.accounts, context.state.accountsInfo, parameter.processFilters);
    //     if (!context.state.sync.halt) {
    //       const missingTokensMap = {};
    //       for (const [blockNumber, txHashes] of Object.entries(txHashesByBlocks)) {
    //         for (const [index, txHash] of Object.keys(txHashes).entries()) {
    //           const txData = context.state.txs[txHash] || null;
    //           if (txData != null) {
    //             // const events = getEvents(account, context.state.accounts, context.state.eventSelectors, preERC721s, txData);
    //             const results = parseTx(account, context.state.accounts, context.state.functionSelectors, context.state.eventSelectors, preERC721s, txData);
    //             for (const [eventIndex, eventItem] of results.myEvents.entries()) {
    //               // TODO: CryptoPunks Transfer tokens -> tokenId
    //               if (eventItem.type == 'preerc721' || eventItem.type == 'erc721' || eventItem.type == 'erc1155') {
    //                 const tokenContract = context.state.accounts[eventItem.contract] || {};
    //                 console.log(blockNumber + " " + txHash + " " + eventItem.type + " " + eventItem.contract + " " + (tokenContract ? tokenContract.type : '') + " " + (tokenContract ? tokenContract.name : '') + " " + (eventItem.tokenId ? eventItem.tokenId : '?'));
    //                 if (tokenContract.assets) {
    //                   if (!(eventItem.tokenId in tokenContract.assets)) {
    //                     if (!(eventItem.contract in missingTokensMap)) {
    //                       missingTokensMap[eventItem.contract] = {};
    //                     }
    //                     if (!(eventItem.tokenId in missingTokensMap[eventItem.contract])) {
    //                       missingTokensMap[eventItem.contract][eventItem.tokenId] = true;
    //                     }
    //                   }
    //                 } else {
    //                   console.log("token contract not found");
    //                 }
    //               }
    //             }
    //           }
    //         }
    //       }
    //       let totalItems = 0;
    //       const missingCryptoPunksV1TokensList = [];
    //       const missingMoonCatRescueTokensList = [];
    //       const missingCryptoCatsTokensList = [];
    //       const missingTokensList = [];
    //       for (const [tokenContract, tokenIds] of Object.entries(missingTokensMap)) {
    //         totalItems += Object.keys(tokenIds).length;
    //         for (let tokenId of Object.keys(tokenIds)) {
    //           // CryptoPunksV1
    //           if (tokenContract == "0x6Ba6f2207e343923BA692e5Cae646Fb0F566DB8D") {
    //             missingCryptoPunksV1TokensList.push({ tokenContract, tokenId });
    //             // MoonCatRescue
    //           } else if (tokenContract == "0x60cd862c9C687A9dE49aecdC3A99b74A4fc54aB6") {
    //             missingMoonCatRescueTokensList.push({ tokenContract, tokenId });
    //             // CryptoCats
    //           } else if (tokenContract == "0x088C6Ad962812b5Aa905BA6F3c5c145f9D4C079f") {
    //             missingCryptoCatsTokensList.push({ tokenContract, tokenId });
    //             // Lunar
    //           } else if (tokenContract == "0x43fb95c7afA1Ac1E721F33C695b2A0A94C7ddAb2") {
    //             const tokenData = {
    //               contract: tokenContract,
    //               tokenId: tokenId,
    //               name: "LunarToken #" + tokenId,
    //               description: "LunarToken #" + tokenId,
    //               image: "https://wrapped-lunars.netlify.app/previews/" + tokenId + ".png",
    //               type: "preerc721",
    //               isFlagged: null,
    //               events: {},
    //             }
    //             context.commit('addAccountToken', tokenData);
    //           } else {
    //             missingTokensList.push({ tokenContract, tokenId });
    //           }
    //         }
    //       }
    //       console.log("missingCryptoPunksV1TokensList: " + JSON.stringify(missingCryptoPunksV1TokensList));
    //       for (const [tokenIndex, token] of missingCryptoPunksV1TokensList.entries()) {
    //         console.log("Processing " + tokenIndex + " " + token.tokenContract + "/" + token.tokenId);
    //         const tokenData = {
    //           contract: token.tokenContract,
    //           tokenId: token.tokenId,
    //           name: "CryptoPunkV1 #" + token.tokenId,
    //           description: "CryptoPunkV1 #" + token.tokenId,
    //           image: "https://cryptopunks.app/public/images/cryptopunks/punk" + token.tokenId + ".png",
    //           type: "preerc721",
    //           isFlagged: null,
    //           events: {},
    //         }
    //         context.commit('addAccountToken', tokenData);
    //       }
    //       console.log("missingMoonCatRescueTokensList: " + JSON.stringify(missingMoonCatRescueTokensList));
    //       for (const [tokenIndex, token] of missingMoonCatRescueTokensList.entries()) {
    //         console.log("Processing " + tokenIndex + " " + token.tokenContract + "/" + token.tokenId);
    //         const tokenData = {
    //           contract: token.tokenContract,
    //           tokenId: token.tokenId,
    //           name: "MoonCat #" + token.tokenId,
    //           description: "MoonCat #" + token.tokenId,
    //           image: "https://api.mooncat.community/image/" + token.tokenId,
    //           type: "preerc721",
    //           isFlagged: null,
    //           events: {},
    //         }
    //         context.commit('addAccountToken', tokenData);
    //       }
    //       console.log("missingCryptoCatsTokensList: " + JSON.stringify(missingCryptoCatsTokensList));
    //       for (const [tokenIndex, token] of missingCryptoCatsTokensList.entries()) {
    //         console.log("Processing " + tokenIndex + " " + token.tokenContract + "/" + token.tokenId);
    //         const tokenData = {
    //           contract: token.tokenContract,
    //           tokenId: token.tokenId,
    //           name: "CryptoCat #" + token.tokenId,
    //           description: "CryptoCat #" + token.tokenId,
    //           image: "https://cryptocats.thetwentysix.io/contents/images/cats/" + token.tokenId + ".png",
    //           type: "preerc721",
    //           isFlagged: null,
    //           events: {},
    //         }
    //         context.commit('addAccountToken', tokenData);
    //       }
    //       // console.log("missingTokensList: " + JSON.stringify(missingTokensList));
    //       context.commit('setSyncSection', { section: 'Build Tokens', total: missingTokensList.length });
    //       const GETTOKENINFOBATCHSIZE = 40; // 50 causes the Reservoir API to fail for some fetches
    //       const info = {};
    //       const DELAYINMILLIS = 2500;
    //       for (let i = 0; i < missingTokensList.length && !context.state.sync.halt; i += GETTOKENINFOBATCHSIZE) {
    //         const batch = missingTokensList.slice(i, parseInt(i) + GETTOKENINFOBATCHSIZE);
    //         let continuation = null;
    //         do {
    //           let url = "https://api.reservoir.tools/tokens/v5?" + batch.map(e => 'tokens=' + e.tokenContract + ':' + e.tokenId).join("&");
    //           url = url + (continuation != null ? "&continuation=" + continuation : '');
    //           url = url + "&limit=50";
    //           console.log(url);
    //           const data = await fetch(url).then(response => response.json());
    //           context.commit('setSyncCompleted', parseInt(i) + batch.length);
    //           continuation = data.continuation;
    //           if (data.tokens) {
    //             for (let record of data.tokens) {
    //               context.commit('addAccountToken', record.token);
    //             }
    //           }
    //           await delay(DELAYINMILLIS);
    //         } while (continuation != null);
    //       }
    //     }
    //   }
    // },
    // async syncBuildTokenEvents(context, parameter) {
    //   logInfo("dataModule", "actions.syncBuildTokenEvents: " + JSON.stringify(parameter));
    //   const provider = new ethers.providers.Web3Provider(window.ethereum);
    //   const ensReverseRecordsContract = new ethers.Contract(ENSREVERSERECORDSADDRESS, ENSREVERSERECORDSABI, provider);
    //   const preERC721s = store.getters['config/settings'].preERC721s;
    //   for (const [accountIndex, account] of parameter.accountsToSync.entries()) {
    //     console.log("actions.syncBuildTokenEvents: " + accountIndex + " " + account);
    //     const accountData = context.state.accounts[account] || {};
    //     const txHashesByBlocks = getTxHashesByBlocks(account, context.state.accounts, context.state.accountsInfo, parameter.processFilters);
    //     if (!context.state.sync.halt) {
    //       const missingTokenEventsMap = {};
    //       for (const [blockNumber, txHashes] of Object.entries(txHashesByBlocks)) {
    //         const block = context.state.blocks[blockNumber] || null;
    //         const timestamp = block && block.timestamp || null;
    //         for (const [index, txHash] of Object.keys(txHashes).entries()) {
    //           const txData = context.state.txs[txHash] || null;
    //           if (txData != null) {
    //             const results = parseTx(account, context.state.accounts, context.state.functionSelectors, context.state.eventSelectors, preERC721s, txData);
    //             context.commit('addAccountTokenEvents', { txHash, blockNumber, transactionIndex: txData.txReceipt.transactionIndex, timestamp, events: results.myEvents });
    //           }
    //         }
    //       }
    //       let totalItems = 0;
    //       const missingTokensList = [];
    //       console.log("missingTokenEventsMap: " + JSON.stringify(missingTokenEventsMap, null, 2));
    //     }
    //   }
    // },
    async syncImportExchangeRates(context, parameter) {
      const reportingCurrency = store.getters['config/settings'].reportingCurrency;
      logInfo("dataModule", "actions.syncImportExchangeRates - reportingCurrency: " + reportingCurrency);
      const MAXDAYS = 2000;
      const MINDATE = moment("2015-07-30");
      let toTs = moment();
      const results = {};
      while (toTs.year() >= 2015) {
        let days = toTs.diff(MINDATE, 'days');
        if (days > MAXDAYS) {
          days = MAXDAYS;
        }
        let url = "https://min-api.cryptocompare.com/data/v2/histoday?fsym=ETH&tsym=" + reportingCurrency + "&toTs=" + toTs.unix() + "&limit=" + days;
        if (parameter.cryptoCompareAPIKey) {
          url = url + "&api_key=" + parameter.cryptoCompareAPIKey;
        }
        console.log(url);
        const data = await fetch(url)
          .then(response => response.json())
          .catch(function(e) {
            console.log("error: " + e);
          });
        for (day of data.Data.Data) {
          results[moment.unix(day.time).format("YYYYMMDD")] = day.close;
        }
        toTs = moment(toTs).subtract(MAXDAYS, 'days');
      }
      context.commit('setExchangeRates', results);
      context.dispatch('saveData', ['exchangeRates']);
    },
    async syncRefreshENS(context, parameter) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const ensReverseRecordsContract = new ethers.Contract(ENSREVERSERECORDSADDRESS, ENSREVERSERECORDSABI, provider);
      const addresses = Object.keys(context.state.accounts);
      const ENSOWNERBATCHSIZE = 200; // Can do 200, but incorrectly misconfigured reverse ENS causes the whole call to fail
      for (let i = 0; i < addresses.length; i += ENSOWNERBATCHSIZE) {
        const batch = addresses.slice(i, parseInt(i) + ENSOWNERBATCHSIZE);
        const allnames = await ensReverseRecordsContract.getNames(batch);
        for (let j = 0; j < batch.length; j++) {
          const account = batch[j];
          const name = allnames[j];
          // const normalized = normalize(account);
          // console.log(account + " => " + name);
          context.commit('addENSName', { account, name });
        }
      }
      context.dispatch('saveData', ['ensMap']);
    },
    // Called by Connection.execWeb3()
    async execWeb3({ state, commit, rootState }, { count, listenersInstalled }) {
      logInfo("dataModule", "execWeb3() start[" + count + ", " + listenersInstalled + ", " + JSON.stringify(rootState.route.params) + "]");
    },
  },
};
