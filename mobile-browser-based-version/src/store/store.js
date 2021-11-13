import { createStore } from 'vuex';
import { TrainingManager } from '../helpers/training/training_manager'; //"../../helpers/training_script/training_manager";

export const store = createStore({
  state: {
    count: 0,
    globalTaskFrameState: new Array(),
    passwords: new Array(),
    tasks: new Array(),
    useIndexedDB: true,
  },
  mutations: {
    increment(state) {
      state.count++;
    },

    async addGlobalTaskFrameState(state, newGlobalTaskFrameState) {
      let modelId = newGlobalTaskFrameState.modelId;
      state.globalTaskFrameState[modelId] = newGlobalTaskFrameState;
    },

    async addPassword(state, payload) {
      state.passwords[payload.id] = payload.password;
    },

    async addTask(state, payload) {
      state.tasks[payload.task.trainingInformation.modelId] = payload.task;
    },

    setIndexedDB(state, payload) {
      // Convert payload to boolean value
      state.useIndexedDB = payload ? true : false;
    }
  },

  getters: {
    trainingManagers: state => {
      return state.trainingManagers;
    },
    globalTaskFrameState: state => modelId => {
      return state.globalTaskFrameState[modelId];
    },
    password: state => taskId => {
      return taskId in state.passwords ? state.passwords[taskId] : null;
    },
    tasks: state => modelId => {
      return state.tasks[modelId];
    },
  },
});

export default store;
