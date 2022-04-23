<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { ethers, utils } from 'ethers'
import abi from '../assets/abi.json'
import { Countdown } from 'vue3-flip-countdown'


const accountAddress = ref('')
const goal = ref('')
const pool = ref('')
const progress = ref(0)
const investAmount = ref('')
const rewardAmount = ref('')
const txHash = ref('')
const hasReward = ref(false)
const accountReward = ref('')
const fundingStage = ref(0)
const endTime = ref(0)

let contract = {}

watch(investAmount, async (value) => {
  const reward = await contract.calculateReward(utils.parseEther(value)).then(res => utils.formatUnits(res, 18))
  rewardAmount.value = reward
})

async function invest() {
  const tx = await contract.invest({value: utils.parseEther(investAmount.value)})
  txHash.value = tx.hash
  await tx.wait()

  window.location.reload()
}

onMounted(async() => {
  await window.ethereum.request({method: 'eth_requestAccounts'})

  window.ethereum.on('accountsChanged', () => window.location.reload())
  window.ethereum.on('chainChanged', () => window.location.reload())

  const provide = new ethers.providers.Web3Provider(window.ethereum)
  const signer = await provide.getSigner()
  accountAddress.value = await signer.getAddress()

  contract = new ethers.Contract(
    `${import.meta.env.VITE_CONTRACT_ADDRESS}`,
    abi,
    signer
  )

  contract.fundingStage().then(res => fundingStage.value = parseInt(res))
  contract.endTime().then(res => endTime.value = res * 1000)

  contract.rewardOf(accountAddress.value).then(res => {
    const reward = utils.formatUnits(res, 18)
    if(reward != 0) {
    hasReward.value = true;
    accountReward.value = reward
    }
  })
  
  const goalTask = contract.goal().then(res => goal.value = utils.formatEther(res))
  const poolTask = contract.pool().then(res => pool.value = utils.formatEther(res))
  await Promise.all([goalTask, poolTask])
  progress.value = (pool.value / goal.value) * 100
})

const style = {
  header: "max-w-7xl mx-auto sm:px-6 lg:px-8",
  hederBorder: "border-b border-gray-200 px-4 sm:px-0",
  hederFlex: "h-16 flex items-center justify-between",
  metamaskBtn: "w-full flex items-center justify-center px-6 py-1 border border-transparent text-base font-medium rounded-xl text-white bg-gray-900 divide-x divide-gray-600 hover:bg-gray-700 md:text-lg",
  main: "mt-24 px-4 sm:mt-10 max-w-7xl mx-auto sm:px-6 lg:px-8",
  investBox: "absolute inset-0 bg-gradient-to-r from-gray-300 to-gray-600 shadow-lg transform -skew-y-6 sm:skew-y-0 sm:-rotate-6 sm:rounded-3xl",
  investBoxBg: "relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-10",
  progressBar: "w-8/12 mt-2 bg-gradient-to-r from-blue-800 via-indigo-600 to-blue-500 py-1 text-center rounded-full",
  textBox: "px-4 py-2 rounded-lg border border-gray-500 text-gray-600 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-200",
  currency: "flex items-center bg-grey-lighter rounded rounded-r-none px-3 font-bold text-grey-darker",
  investBtn: "p-2 pl-5 pr-5 bg-gray-800 text-gray-100 text-lg rounded-lg focus:border-4 border-blue-300",
}

</script>

<template>
  <div>
    <header :class=style.header>
      <div :class=style.hederBorder>
        <div :class=style.hederFlex>
          <div class="flex-1 flex">
            <a href>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fill-rule="evenodd"
                  d="M10.496 2.132a1 1 0 00-.992 0l-7 4A1 1 0 003 8v7a1 1 0 100 2h14a1 1 0 100-2V8a1 1 0 00.496-1.868l-7-4zM6 9a1 1 0 00-1 1v3a1 1 0 102 0v-3a1 1 0 00-1-1zm3 1a1 1 0 012 0v3a1 1 0 11-2 0v-3zm5-1a1 1 0 00-1 1v3a1 1 0 102 0v-3a1 1 0 00-1-1z"
                  clip-rule="evenodd"
                />
              </svg>
            </a>
          </div>
          <div class="rounded-md shadow">
            <button :class=style.metamaskBtn>
              <span>{{ accountAddress }}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
    <div v-if="endTime != 0">
      End Time
      <Countdown mainColor="#ffffff" labelSize="0.7em" :deadlineDate="new Date(endTime)"/>
    </div>
    <main :class=style.main>
      <div>
        <div v-show="!hasReward" class="relative py-3 sm:max-w-sm sm:mx-auto">
          <div :class=style.investBox></div>
          <div :class=style.investBoxBg>
            <div class="max-w-md mx-auto">
              <div class="flex flex-col">
                <div class="flex flex-col space-y-2">
                  <label for="success" class="text-gray-700 select-none font-medium text-sm">You Buy</label>
                  <div class="flex flex-row">
                    <span :class=style.currency >ETH</span>
                    <input v-model="investAmount" type="text" name="default" placeholder="0.00" :class=style.textBox />
                  </div>
                </div>
              </div>
              <br />
              <div class="flex flex-col">
                <div class="flex flex-col space-y-2">
                  <label for="success" class="text-gray-700 select-none font-medium text-sm">
                    You Receive
                  </label>
                  <div class="flex flex-row">
                    <span :class=style.currency>UTD</span>
                    <input v-model="rewardAmount" :class=style.textBox type="text"  placeholder="0" disabled/>
                  </div>
                </div>
              </div>
              <br />
              <div class="relative text-center">
                <button type="button" :class=style.investBtn @click="invest">Invest</button>
              </div>
            </div>
          </div>
        </div>
        <div v-show="hasReward" class="relative py-3 sm:max-w-sm sm:mx-auto">
          <div class="flex flex-col bg-white px-8 py-6 max-w-sm mx-auto rounded-lg shadow-lg">
            <div class="flex justify-center items-center font-bold text-xl">Pending Reward</div>
            <div class="mt-4">
              <div class="text-center">
                <h1 class="text-4xl font-bold text-gray-800">{{ accountReward }}</h1>
                <span class="text-gray-500">UTD</span>
              </div>
              <div v-show="fundingStage == 2" class="relative text-center">
                <button type="button" :class=style.investBtn>Claim</button>
              </div>
              <div v-show="fundingStage == 3" class="relative text-right">
                    <button title="Can refund when fail or time over" type="button" @click="refund">refund 0</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <br />
      <br />

      <div class="text-lg text-center text-gray-700 font-bold">
        <p v-show="txHash" class="text-orange-500">Pending: {{ txHash }}</p>
        <hr />
        <div>Goal: {{ goal }} ETH</div>
        <div>Pool: {{ pool }} ETH</div>
      </div>
      <div class="mt-2 bg-gray-300 rounded-full">
        <div :class=style.progressBar v-bind:style="{ width: progress + '%' }">
          <div class="text-white text-sm inline-block px-2 rounded-full">{{ progress }}%</div>
        </div>
      </div>
      <br />
    </main>
  </div>
</template>

<style scoped>
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
</style>