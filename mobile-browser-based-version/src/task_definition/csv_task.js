import * as d3 from 'd3';
import * as tf from '@tensorflow/tfjs';
import { checkData } from '../helpers/data_validation_script/helpers-csv-tasks';
import { Task } from './task.js';

/**
 * Dummy class to hold the Titanic Task information
 */
export class CsvTask extends Task{
  /**
   * This functions takes as input a file (of type File) uploaded by the reader and checks
   * if the said file meets the constraints requirements and if so prepare the training data.
   * @param {File} file file uploaded by the user
   * @returns an object of the form: {accepted: Boolean, Xtrain: training data, ytrain: data's labels}
   */
  async dataPreprocessing(file, headers) {
    console.log('Start: Processing Uploaded File');
    var Xtrain = null;
    var ytrain = null;

    // Check some basic prop. in the user's uploaded file

    var checkResult = await checkData(file, headers);
    var startTraining = checkResult.accepted;
    var headerCopied = checkResult.userHeader;

    // If user's file respects our format, parse it and start training
    if (startTraining) {
      console.log('User File Validated. Start parsing.');
      console.log(headerCopied);

      let originalHeaders = headers.map(element => element['userHeader'])
      let inputColumns = this.trainingInformation.inputColumns;
      let indices = Array.from({length: headers.length}, (x, i) => i)
      let inputIndices = indices.filter(i => inputColumns.includes(originalHeaders[i]))
      let Xcsv = d3.csvParse(
        file.target.result,
        function(d) {
          let result = inputIndices.map(i => +d[headerCopied[i]])
          return result
        },
        function(error, rows) {
          console.log(error)
          console.log(rows);
        }
      );
      let yIdx = originalHeaders.indexOf(this.trainingInformation.outputColumn)
      let ycsv = d3.csvParse(
        file.target.result,
        function(d) {
          return +d[headerCopied[yIdx]];
        },
        function(error, rows) {
          console.log(error)
          console.log(rows);
        }
      );

      Xtrain = tf.tensor2d(Xcsv);
      ytrain = tf.tensor1d(ycsv);
      // object to return
    } else {
      console.log('Cannot start training.');
    }
    return { accepted: startTraining, Xtrain: Xtrain, ytrain: ytrain };
  }
}
