import * as tf from '@tensorflow/tfjs';
import { InteroperabilityLayer } from '../model_definition/custom_layers';
import { getWorkingModel, getWorkingModelMetadata } from '../memory/helpers';
import { CsvTask } from '../../task_definition/csv_task';

/**
 * Enumeration of the different types of personalization.
 */
export const personalizationType = {
  NONE: 'NONE',
  INTEROPERABILITY: 'interoperability',
};

/**
 * This class represents a default model and will simply
 * encapsulate the default model for a given task.
 */
export class Model {
  constructor(task, useIndexedDB) {
    this.task = task;
    this.dataType = task.trainingInformation.dataType;
    this.useIndexedDB = useIndexedDB;
    this.type = personalizationType.NONE;
  }

  /**
   * Initializes the model for a given task.
   *
   * It will check the metadatas we stored to see if there is already asuch model in memory and if so returns it.
   *
   * Otherwise (no such model or we are not using index DB) it will create a new model.
   *
   * Finally if the type of the previously stored model doesn't correspond to the one we are creating, in will also create a new one.
   *
   * This method should not need to be overriden by subclasses.
   */
  async init() {
    let model;
    // Check if we use IndexedDB
    if (this.useIndexedDB) {
      let modelParams = [
        this.task.taskId,
        this.task.trainingInformation.modelId,
      ];
      let metadata = await getWorkingModelMetadata(...modelParams);

      // Check if a working model already exists in storage.
      if (metadata) {
        console.log('Loading model from memory');
        model = await getWorkingModel(...modelParams);
      } else {
        console.log(`Creating new ${this.type} model`);
        model = await this._createModel();
      }
    } else {
      console.log(`No IndexedDB : Creating new ${this.type} model`);
      model = await this._createModel();
    }

    // Make sure that the current working model is indeed the type we expect.
    if (model.getUserDefinedMetadata()['personalizationType'] == this.type) {
      this.model = model;
    } else {
      console.log(
        `Previous working model was not of type ${this.type} : creating a new one`
      );
      this.model = await this._createModel();
    }
  }

  /**
   * Private method to create the model.
   *
   * This should be overriden in sublcasses in order to define the personalized model.
   * @returns the newly created model.
   */
  async _createModel() {
    return await this.task.createModel();
  }

  /**
   *  Getter for the model.
   *  @returns the model we want to train.
   */
  getModel() {
    return this.model;
  }

  /**
   *  This is a getter for the part of the model we want to share with the network.
   *  For personalizationType.NONE this is simply the model.
   *  The behaviour depends on the personalization type of the model.
   *  @returns the part of the model we want to share.
   */
  getSharedModel() {
    return this.model;
  }

  /**
   *  Getter for the personalization type.
   *  @returns the personalization type of the model.
   */
  getPersonalizationType() {
    return this.type;
  }
}

/**
 * This class defines a model that uses Interoperabiliy personalization.
 * as defined in David Roschewit's paper on Interoperability (https://arxiv.org/abs/2107.06580).
 *
 * It allows us to learn a feature-shift and a target-shift with respect to the federation.
 * The values of weight and biases of the interoperability layers
 * are directly interpretable to understand differences in distributions of features.
 *
 */
export class InteroperabilityModel extends Model {
  constructor(task, useIndexedDB) {
    super(task, useIndexedDB);
    this.type = personalizationType.INTEROPERABILITY;
    this.dataType = task.trainingInformation.dataType;
    if (this.dataType != 'csv')
      throw 'Interoperability framework can only be used on csv data';
  }

  async _createModel() {
    let model = await this.task.createModel();
    model = this._createInteroperabilityModel(model);
    model.setUserDefinedMetadata({
      personalizationType: personalizationType.INTEROPERABILITY,
    });
    return model;
  }

  /**
   * Private method that, given a model, creates an Interoperability Model by wrapping it in between two Interoperability Layers.
   * @param {Object} model the model we want to wrap
   * @returns the model wrapped in between two Interoperability Layers.
   */
  _createInteroperabilityModel(model) {
    let modelInputSize = model.layers[0].input.shape[1];
    let modelOutputSize = model.layers[model.layers.length - 1].outputShape[1];

    let personalModel = tf.sequential();

    personalModel.add(
      new InteroperabilityLayer({
        units: modelInputSize,
        inputShape: [modelInputSize],
      })
    );
    personalModel.add(model);
    personalModel.add(new InteroperabilityLayer({ units: modelOutputSize }));

    return personalModel;
  }

  getSharedModel() {
    return this.model.layers[1];
  }

  /**
   * Returns the weights and biases for the interoperability layers.
   * These weights and can be directly interpreted and give feedback to the user.
   * @returns {Float32Array} the weights and biases of the interoperability layers as an array [weightsIn, biasesIn, weightsOut, biasesOut].
   */
  getInteroperabilityParameters() {
    /*return {
      weightsIn: this.model.layers[0].weights[0].read().dataSync(),
      biasesIn: this.model.layers[0].weights[1].read().dataSync(),
    };*/
    return [
      this.model.layers[0].weights[0].read().dataSync(),
      this.model.layers[0].weights[1].read().dataSync(),
      this.model.layers[this.model.layers.length - 1].weights[0]
        .read()
        .dataSync(),
      this.model.layers[this.model.layers.length - 1].weights[1]
        .read()
        .dataSync(),
    ];
  }
}