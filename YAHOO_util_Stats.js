

//////////////////////////////////////////////////
/// Some stats
///
//////////////////////////////////////////////////


(function() {

var Lang = YAHOO.lang,
    sortNum = function(a,b){return a-b;};

/**
 * The Stats utility holds an array of numerical data and calculates various
 * statistics from it.
 *
 * @module stats
 * @requires yahoo
 * @title Stats utility
 */

/****************************************************************************/
/****************************************************************************/
/****************************************************************************/

/**
 * Statistics utility class for the YUI DataTable widget column stats extension
 * (although no reason you couldn't use it elsewhere).
 *
 * @namespace YAHOO.util
 * @class Stats
 * @constructor
 * @param data     {Array} of data, or each argument passed as a separate data 
 * value.  Values must be numeric or they won't be included.
 */


YAHOO.util.Stats = function () {

  var d, i=0, ret=[];
  
  // Accept an array or n arguments
  if (arguments.length === 1 && Lang.isArray(arguments[0])) {
    d = arguments[0];
  } else {
    d = Array.prototype.constructor.apply(this, arguments);
  }
  
  // Must be numeric
  for (; i < d.length; i=i+1) {
    if (Lang.isNumber(d[i])) {
      ret.push(d[i]);
    }
  }
  
  this._count = ret.length;
  // Remember values:
  this._sum = undefined;
  this._mean = undefined;
  this._median = undefined;
  this._variance = undefined;
  
  // Sort and store
  //ret.sort(function(a,b){return a - b;});
  this.data = ret;
  this.sort();

};



/////////////////////////////////
//// Public methods
/////////////////////////////////

YAHOO.util.Stats.prototype = {

  /**
   * @method sum
   * @description Calculates the sum of all data values
   * @return {Float}    The sum
   */
  sum : function() {
    var i = 0,
        tot = 0,
        vals = this.data;
        
    if (this._sum === undefined) {
      for (; i < vals.length; i=i+1) {
        tot = tot + vals[i];
      }
      this._sum = tot;
    }
    return this._sum;
  },
  
  /**
   * @method median
   * @description Calculates the median value of the data
   * @return {Float}      The median
   */
  median: function() {
    var len = this.count();
    
    if (len === 0) {
      this._median = undefined;
    }
    else if (this._median === undefined) {
      if (len%2 === 1) {
        this._median = (this.data[((len-1)/2)]);
      }
      this._median = (this.data[(len/2)] + this.data[(len/2)+1])/2;
    }
    return this._median;
  },
  
  /**
   * @method min
   * @description Returns the minimum value of the data
   * @return {Float}      The minimum
   */
  min: function() {
    return this.data[0];
  },
  
  /**
   * @method max
   * @description Returns the maximum value of the data
   * @return {Float}      The maximum
   */
  max: function() {
    return this.data[this.data.length - 1];
  },
  
  /**
   * @method range
   * @description Returns the range (max-min) of the data
   * @return {Float}      The range
   */
  range: function() {
    return this.max() - this.min();
  },  
  /**
   * @method count
   * @description Returns the number of data items value of the data
   * @return {Float}      The minimum
   */
  count: function() {
    if (this._count === undefined) {
      this._count = this.data.length;
    }
    return this._count;
  },  
  /**
   * @method mean
   * @description Returns the mean value of the data
   * @return {Float}      The mean
   */
  mean: function() {
    var n = this.count();
    if (this._mean === undefined) {
      this._mean = n > 0 ? this.sum() / this.count() : undefined;
    }
    return this._mean;
  },  
  /**
   * @method stdev
   * @description Returns the standard deviation value of the data
   * @return {Float}      The standard deviation
   */
  stdev: function() {
    return Math.sqrt(this.variance());
  },  
  /**
   * @method variance
   * @description Returns the variance of the data, assuming the 
   * data are the entire population.
   * @return {Float}      The variance
   */
  variance: function() {
    var i = 0, mu = this.mean(), d = this.data, diff, sums = 0;
    if (this._variance === undefined) {
      
      if (this.count() < 1) {
        return undefined;
      }
      for(;i < this.count(); i=i+1) {
        diff = d[i] - mu;
        sums = sums + (diff*diff);
      }
      this._variance =(sums / i);
    }
    return this._variance;
  },
  
  /**
   * @method varianceUnbiased
   * @description Returns the unbiased variance of the data, i.e. assuming the 
   * data are a sample of the entire population
   * @return {Float}      The variance
   */  
  varianceUnbiased: function() {
    
    var n = this.count();
    
    if (n < 2) {
      return undefined;
    }
    return (this.variance() * n / (n-1));
    
  },
    
  /**
   * @method sort
   * @description Sorts the data numerically, ascending
   * @return {YAHOO.util.Stats}      The stats instance
   */
  sort: function() {
    this.data.sort(sortNum);
    return this;
  },
    
  /**
   * @method addDataValue
   * @description Add a value to the data set.  By default the data will be 
   * sorted after adding the value; if you pass false as the second argument it
   * won't be.  If you're adding several values (in a loop, say), don't sort
   * until the end of the loop to save needless sorting, unless you need any stats
   * in the meantime (min, max, range, median all expect the data to be sorted).
   * @param v {Float}       The value to add
   * @param sort {Boolean}  Whether to sort after adding.  
   * @return {Boolean}      True if the data value was added successfully.
   */
  addDataValue: function(v, sort) {
    if (!Lang.isNumber(v)) {
      return false;
    }
    this.data.push(v);
    if (sort !== false) {
      this.sort();
    }
    if (this._sum === undefined) {
      this._sum = 0;
    }
    this._sum = this._sum + v;
    this._count++;
    this._mean = undefined;
    this._median = undefined;
    this._variance = undefined;    
    return true;

  },
    
  /**
   * @method removeDataValue
   * @description Removes a value from the data set.  Even if the value appears more 
   * once, it will still only be removed once.
   * @param v {Float}      The value to remove
   * @return {Boolean}     True if the value was removed successfully.
   */
  removeDataValue: function(v) {
   
    if (!Lang.isNumber(v)) {
      return false;
    }
  
    var i, ok = false, 
        d = this.data,
        med = this.median(),
        len = this.count();
    
    if (med !== undefined && v > med) {
      for (i = len; i > 0; i=i-1) {
        if (d[i] === v) {
          d.splice(i,1);
          ok = true;
          continue;
        }
      }
    } else {
      for (i = 0; i < len; i=i+1) {
        if (d[i] === v) {
          this.data.splice(i,1);
          ok = true;
          continue;
        }
      }
    }
    
    if (ok) {
      this._sum = this._sum - v;
      this._count--;
      this._mean = undefined;
      this._median = undefined;
      this._variance = undefined;
    }
    return ok;
  }
  
};



}());