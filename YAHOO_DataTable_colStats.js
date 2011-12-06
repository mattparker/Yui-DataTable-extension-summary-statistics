///////////////////////////////////////////////////////
// Column summary statistics etc 
//
// Adds a tfoot with various summary statistic rows.
// Stats are for entire table or, if paginated, for the current page
// (controlled by value of pagedTotals (Boolean)
// Adds a config 'columnStats' which should be an object literal
// of the form:
// {on: true, pagedTotals: true, stats: [{label: 'Page total', fn:'sum'}, 'mean']}
// 
// Current stats available are sum, mean, median, min, max, range, 
// count, stdev, variance
//
// Requires: YAHOO.util.Stats        (A new utility to do the match)
// A patch to datasource to add parseField method   ( see below)
//
// You will also need to tell it which columns to summarise, in your colDefs
// object passed to the DataTable: add a  columnStats: true key-pair
// to the object for the columns you want summarised.
//
// Each stat (e.g. sum) will be displayed in it's own row in the table
// footer.  Each cell (td) in the foot will have class yui-dt-colstat
//
///////////////////////////////////////////////////////
       
        
(function(){

 var Lang = YAHOO.lang,
     Dom = YAHOO.util.Dom,
 

 
 /**
  * Constructor: parent does the work, and we add a listener to set up
  *  the columnchooser
  */
 lpltTable = function( el , oColDef, oDS, oCfg ){
 

   lpltTable.superclass.constructor.call( this, el , oColDef, oDS, oCfg );
   
 
   this.on("columnStatsChange", this._colStatsValueChange);
 
 };
 
 
 

YAHOO.extend( lpltTable, YAHOO.widget.DataTable, {
  

       




     /**
      * @description Reference to the table foot element for summary stats
      * @type HTMLElement
      */
     _colStatsTfoot: null,


     /**
      * @description Holds current column summary stats 
      * @type Object
      */
     _colStatsCache: {},


     /**
      * @method initAttributes
      * @description Initializes attributes
      */
     initAttributes: function( oCfg ){
 
      lpltTable.superclass.initAttributes.call( this, oCfg );

        /**
         * @attribute columnStats
         * @description Adds a tfoot element to the table for totals or other stats
         * 
         * @type Object
         * @default {on: false, stats: [], pagedTotals: false}
         */
        this.setAttributeConfig( 'columnStats', {
          
          value: {on: false, stats: [], pagedTotals: false},
          
          setter: function (v) {
           var k = 0;
           
           // some sanity checks:
           if (v.on !== true) {
             return v;
           }
           if (!Lang.isArray(v.stats)) {
             v.stats = [v.stats];
           }
           if (v.pagedTotals === undefined) {
             v.pagedTotals = false;
           }
           

           
           for (k = v.stats.length -1; k >= 0; k=k-1) {
           
               // normalize to objects:
               if (Lang.isString(v.stats[k])) {
                 v.stats[k] = {
                   label: v.stats[k],
                   fn: v.stats[k]
                 };
               }
               if (!Lang.isFunction(YAHOO.util.Stats.prototype[v.stats[k].fn]) && 
                   !Lang.isFunction(v.stats[k].fn)) {
                 v.stats.splice(k,1);
               }

             }


           

           return v;
          },
          
          // Adds/removes listeners
          method: function (v) {
            this._colStatsRemoveEvents(v);
            if (v && v.on && v.on === true) {
              this._colStatsAddEvents(v);
  
            } 
          }
        }); 
			 

		},
       
       
       
       
       
       
       
       ///////////////////////////////////////////////////////
       // Public methods
       ///////////////////////////////////////////////////////
       
       
       /**
        * @method colStatsRefresh
        * @description Completely re-calculates and renders the column statistics.
        * You may need to use this if data is changed programmatically in such
        * a way that DataTable doesn't fire a useful event.  For example,
        * <code>myDataTable.getRecord(2).setData("quantity", 8);
        * myDataTable.render();
        * myDataTable.colStatsRefresh();
        * </code>
        * But in general you shouldn't need it.
        *
        * @public
        */
        colStatsRefresh : function () {
          this._colStatsDestroy();
          this._colStatsRender(true);
          this._colStatsRenderValues();
        },
       


       
       
       /**
        * @method colStatsGetRecordSet
        * @description Gets recordset for use with totals - either currently
        * visible or all.  Public accessor for _colStatsGetRecordSet
        * @public
        */
        colStatsGetRecordSet: function () {
          return this._colStatsGetRecordSet();
        },




       
       ///////////////////////////////////////////////////////
       // Protected methods
       ///////////////////////////////////////////////////////
       
       /**
        * @method _colStatsAddEvents
        * @description Adds necessary event listeners for column stats
        * @protected
        */
       _colStatsAddEvents : function (cfg) {

         var pag = this.get("paginator");

         // when rendering, re-draw the total values:
         this.on("renderEvent", this._colStatsRenderValues);
         
         // Initially add the tfoot, calculate values
         this.on("initEvent", this._colStatsRender);
         

       
         // Show hide columns:
         this.on("columnHideEvent", this._colStatsColumnHide);
         this.on("columnShowEvent", this._colStatsColumnShow);
         
         
         //Add/remove columns:
         this.on("columnInsertEvent", this._colStatsColumnInsert);
         this.on("columnRemoveEvent", this._colStatsColumnRemove);
         
         
         // Add/remove rows:
         this.on("rowsAddEvent", this._colStatsRowsAdd);
         this.on("rowsDeleteEvent", this._colStatsRowsDelete);
         this.on("rowAddEvent", this._colStatsRowsAdd);
         this.on("rowDeleteEvent", this._colStatsRowsDelete);         
         



         // Pagination?  Are we only doing totals for visible rows?
         if (pag) {
           
           // Totals show only for current page:
           if (cfg.pagedTotals === true) {
             // page change or some other
             pag.on("changeRequest", this._colStatsPageChange, null, this);
             this.on("columnSortEvent", this._colStatsPageChange, null, this);
           } else {
             // Need to udpate totals for newly added rows.
             this.on("rowsAddEvent", this._colStatsRenderValues, undefined, this);
             this.on("rowsDeleteEvent", this._colStatsRenderValues);
             this.on("rowAddEvent", this._colStatsRenderValues, undefined, this);
             this.on("rowDeleteEvent", this._colStatsRenderValues);
           }
         }
         
         
         // Values are changing from inline edit or elsewhere
         this.on("cellUpdateEvent", this._colStatsUpdate);

       },
       
       
       /**
        * @method _colStatsRemoveEvents
        * @protected
        * @description  Removes event listeners for column summary stats
        */
       _colStatsRemoveEvents : function () {
         var pag;
         
         this.removeListener("renderEvent", this._colStatsRenderValues);
         this.removeListener("initEvent", this._colStatsRender);
         this.removeListener("columnHideEvent", this._colStatsColumnHide);
         this.removeListener("columnShowEvent", this._colStatsColumnShow);
         this.removeListener("columnInsertEvent", this._colStatsColumnInsert);
         this.removeListener("columnRemoveEvent", this._colStatsColumnRemove);
         this.removeListener("rowsAddEvent", this._colStatsRowsAdd);
         this.removeListener("rowsDeleteEvent", this._colStatsRowsDelete);
         this.removeListener("rowAddEvent", this._colStatsRowsAdd);
         this.removeListener("rowDeleteEvent", this._colStatsRowsDelete);          
         this.removeListener("rowsAddEvent", this._colStatsRenderValues, undefined, this);
         this.removeListener("rowsDeleteEvent", this._colStatsRenderValues);
         this.removeListener("rowAddEvent", this._colStatsRenderValues, undefined, this);
         this.removeListener("rowDeleteEvent", this._colStatsRenderValues);
         this.removeListener("cellUpdateEvent", this._colStatsUpdate);

         pag = this.get("paginator");
         if (pag) {     
           
           pag.on("changeRequest", this._colStatsPageChange, null, this);
           this.on("columnSortEvent", this._colStatsPageChange);
         }
       
       },
       
       
       
       
       /**
        * @method _colStatsValueChange
        * @protected
        * @description  Called when the config value for colStats changes;
        * updates as necessary.
        */       
       _colStatsValueChange: function(oArgs) {
         if (oArgs.newValue.on === true) {
           this._colStatsPageChange(true);
           this._colStatsRenderValues();
         } else {
           this._colStatsDestroy();
         }
       },
       
       
       /**
        * @method _colStatsDestroy
        * @protected
        * @description  Removes, destroys the tfoot element and wipes out the 
        * stats cache.  Does not remove listeners.
        */              
       _colStatsDestroy: function() {
            this._colStatsTfoot.parentNode.removeChild(this._colStatsTfoot);
            this._colStatsTfoot = null;
            this._colStatsCache = {};    
       },
       
       
       /**
        * @method _colStatsPageChange
        * @protected
        * @param redraw {Boolean}       Whether to remove and redraw the tfoot
        * @description  Called when there's a paginator and summary values
        * are for the current page; updates stats as necessary.
        */              
       _colStatsPageChange: function(redraw) {
         this._colStatsCache = {};
         this._colStatsRender(redraw);
       },
       
       /**
        * @description Renders the tfoot if it hasn't been already,
        * and calculates values.  Values actually inserted into DOM by renderEvent
        * listener.
        * @param redraw {Boolean}       Whether to remove and redraw the tfoot
        * @protected
        */
       _colStatsRender: function(redraw) {
         
         this._colStatsRenderTfoot(redraw);
         
         this._colStatsCalculateValues();
         
       },


       
       /**
        * @description Does the initial calculation of totals etc and 
        * renders the tfoot
        * @param redraw {Boolean}     If true will remove current tfoot and redo it.
        * @protected
        */
       _colStatsRenderTfoot: function(redraw) {
       
          var tf, tr, tdiv, td,  // DOM elements
              i=0, j=0,
              cfgStats,  // what stats do they want?
              cols;      // cols
       
          if (redraw === true && this._colStatsTfoot) {
            this._colStatsTfoot.parentNode.removeChild(this._colStatsTfoot);
            this._colStatsTfoot = null;          
          }
       
          if (this._colStatsTfoot === null) {
             
             cfgStats = this.get("columnStats").stats;
             cols = this.getColumnSet().keys;
             
             tf = this.getTbodyEl().parentNode.createTFoot();
             
             
             // Build a row for each statistic
             for (; j < cfgStats.length; j=j+1) {
             
               tr = tf.insertRow(-1);
               
               if (j === 0) {
                 Dom.addClass(tr, "yui-dt-first");
               }
               
               // now add a column for each
               for (i = 0; i < cols.length; i=i+1) {
                 td = document.createElement('td');
                 Dom.addClass(td, "yui-dt-colstat");
                 Dom.addClass(td, "yui-dt-col-" + cols[i].field);
                 
                 if(cols[i].className !== undefined) {
                     Dom.addClass(td, cols[i].className);
                 }
                 
                 // Keep hidden columns hidden:
                 if (cols[i].hidden === true) {
                   Dom.addClass(td, "yui-dt-hidden");
                 }
                 tdiv = document.createElement('div');
                 Dom.addClass(tdiv, "yui-dt-liner");
                 
                 if (i === 0) {
                   // Put in the name of the stat:
                   tdiv.innerHTML = cfgStats[j].label;
                 }
                 
                 td.appendChild(tdiv);
                 tr.appendChild(td);
                 
               }
               tf.appendChild(tr);
             }
             
             // Remember for later
             this._colStatsTfoot = tf;
 
          }
       },

       
       
       /**
        * @method _colStatsRenderValues
        * @description Puts the values in the cells. The actual DOM elements
        * should already be there from _colStatsRender
        * @param colId {String}    The column id to render, or do all if nothing passed.
        * @protected
        */
       _colStatsRenderValues: function(colId) {
   
         var els = Dom.getElementsByClassName("yui-dt-liner", "div", this._colStatsTfoot),
             cols = (colId && this.getColumn(colId) ? 
                       [this.getColumn(colId)] :
                       this.getColumnSet().keys),
             cfgStats = this.get("columnStats").stats,
             stats = this._colStatsCache,
             startI = 0,
             thisStat,
             cellValue = '',
             statsInstance,
             i = 0, j=0, ij;
         
         // just doing one column
         if (colId !== undefined) {
           startI = cols[0].getKeyIndex();
         }
             
         for (; j < cfgStats.length; j=j+1) {
           for (i=startI; i < cols.length; i=i+1) {
             
             ij = (cols.length*j)+i;
             thisStat = cfgStats[j];

             // Render the value: 
             // If it's the first column, show labels
             // If there's a value, use formatter if it exists and if not just put the value in
             // If it's the first column leave it alone (assuming 'Total' or 'Mean' etc)
             // Otherwise blank out the cell 
             if (!els[ij]) {
               continue;
             }
             
             
             // Default:
             cellValue = '';
             // Labels go in the first column
             if (i === 0) {
               cellValue = thisStat.label;
             } else if (stats[cols[i].field] !== undefined) {
             
               // Work out the value:
               statsInstance = stats[cols[i].field].stats;
               
               // If we're calling a method on YAHOO.util.Stats:
               if (Lang.isString(thisStat.fn) && statsInstance[thisStat.fn] !== undefined) {
                 // this will be mean, min etc on the Stats instance
                 cellValue = (statsInstance[thisStat.fn])();
               } else if (Lang.isFunction(thisStat.fn)) {
               
                 // It's a user function using who knows what data
                 // Function receives arguments:
                 //   - YAHOO.util.Stats instance,
                 //   - An object literal containing all the Stats instances for 
                 //       'summarisable' fields
                 //   - The column object that we're on
                 cellValue = thisStat.fn.call(this, statsInstance, stats, cols[i]);
               
               }
             
             }
             
             // Now display it: 
             
             if (i === 0 || !Lang.isFunction(cols[i].formatter) || cols[i].columnStats !== true) {
               els[ij].innerHTML = cellValue;
             } else {
               cols[i].formatter.call(this, els[ij], null, cols[i], cellValue);
             }
             

           }
         }

       },

       
       /**
        * @method _colStatsGetRecordSet
        * @description  Gets recordset for use with totals - either currently
        * visible or all.
        * @protected
        */
       _colStatsGetRecordSet: function() {
       
          var rs = this.getRecordSet(),
              pag, 
              ret;
              
          if (this.get("columnStats").pagedTotals === true) {
            pag = this.get("paginator");
            if (pag) {
              ret = rs.getRecords(pag.getStartIndex(), pag.getRowsPerPage());
              return ret;
            } 
          }
          
            return rs.getRecords();           
       
       },
       
       /** 
        * @method _colStatsCalculateValues
        * @description Calculates summary statistics for one column or for
        * all (if no argument passed).
        * @param colId {String}    Column id to calculate for (or all if no argument)
        * @protected
        * 
        */
       _colStatsCalculateValues: function(colId) {
          
          var recs = this._colStatsGetRecordSet(),
              cols = (colId && this.getColumn(colId)) ? 
                        [this.getColumn(colId)] : 
                        this.getColumnSet().keys,
              i = 0,
              j,
              val,
              field,
              vals = (colId ? this._colStatsCache || {} : {});




           // Reset if we're just doing one column
           if (colId && vals[cols[0].field] !== undefined) {
             vals[cols[0].field].stats = undefined;
           }


           // Work through records creating a YAHOO.util.Stats instance for
           // each Column
           for (; i < recs.length; i=i+1) {
           
              for (j = 0; j < cols.length; j = j+1) {
              
                 if (cols[j].columnStats !== true) {
                   continue;
                 }
                
                 val = recs[i].getData(cols[j].field);
                 field = cols[j].field;

                                    
                 if (Lang.isNumber(val)) {
                   if (vals[field] === undefined || vals[field].stats === undefined) {
                     vals[field] = {stats: new YAHOO.util.Stats()};
                   }
                   // And add some data to the Stats instance
                   vals[field].stats.addDataValue(val, false);
                   
                 }
                 
              }             
           
           }
           
           //Now sort the Stats instances
           for (i in vals) {
             if (vals.hasOwnProperty(i) && vals[i].stats) {
               vals[i].stats.sort();
             }
           }
           
           this._colStatsCache = vals;

           return vals;    
       },
       
       



       
       /**
        * @method _colStatsUpdate
        * @description Updates summary stats when data changes.
        * @param oArgs {Object}      Object passed by cellUpdateEvent    
        * @protected
        */
       _colStatsUpdate: function(oArgs) {


            var key,
                ds = this.getDataSource(),
                colStats,
                parsedNewData,
                parsedOldData;
         
         // A cellUpdateEvent called this
          if (oArgs.record && oArgs.column) {
            // only update ones that ought to be updated!

            key = oArgs.column.key;
            parsedNewData = ds.parseField(key, oArgs.record.getData(key));
            parsedOldData = ds.parseField(key, oArgs.oldData);
            
            oArgs.record.setData(key, parsedNewData);
          }

          // We don't need to do any more - stats not used.
          if (oArgs.column.columnStats !== true) {
            return;
          }
            
                        
          colStats = this._colStatsCache[key];
          
          if (colStats === undefined) {
             colStats = {stats: new YAHOO.util.Stats()};
          }
          colStats.stats.removeDataValue(parsedOldData);
          colStats.stats.addDataValue(parsedNewData);
          //this._colStatsCalculateValues(key);
          this._colStatsCache[key] = colStats;
          // Redraw values.
          this._colStatsRenderValues();

          return;
       },
       
       
       /**
        * @method _colStatsColumnHide
        * @description When hiding a column, make sure we hide the footer
        * @protected
        * @param oArgs {Object}    Object passed by event
        * @return Array     Of td els hidden
        */
       _colStatsColumnHide: function(oArgs) {
       
         return this._colStatsColumnShowHide(function(n){
            Dom.addClass(n, "yui-dt-hidden");
         }, oArgs.column.getKeyIndex());

       },
       
       /**
        * @method _colStatsColumnShow
        * @description When showing a column, make sure we show the footer
        * @param oArgs {Object}        Object passed by event
        * @protected
        * @return Array     Of td els shown
        */
       _colStatsColumnShow: function(oArgs) {
         
         return this._colStatsColumnShowHide(function(n){
             Dom.removeClass(n, "yui-dt-hidden");
         }, oArgs.column.getKeyIndex());

       },
       
       
       /**
        * @method _colStatsColumnShowHide
        * @description Calls function fn on each td cell in the tfoot, or just on 
        * the index-th cell of each row in the foot.
        * @protected
        * @param fn {Function}     Function to call on each td node
        * @param index {Int}       Optional index (ie column number) of cell
        * @return {Array}          Returns td elements
        */
       _colStatsColumnShowHide: function(fn, index) {
          var els = Dom.getElementsBy(function(){return true;}, "tr", this._colStatsTfoot),
             tdEls,
             i = 0, j,
             checkFn = (index ? function(){j=j+1; return (j-1) === index;} : function() {return true;});
             
         for (; i<els.length; i=i+1) {
           j = 0;
           tdEls = Dom.getElementsBy(checkFn, "td", els[i], fn);
         }
         return tdEls;
       },
       
       
       
       /**
        * @method _colStatsColumnInsert
        * @description Called when a column is inserted
        * @param oArgs {Object}     Object passed by event
        * @protected
        */
       _colStatsColumnInsert: function(oArgs) {
            // redraw the tfoot:
            this._colStatsRenderTfoot(true);
            this._colStatsCalculateValues(oArgs.column.key);
       },
       
       
       /**
        * @method _colStatsColumnRemove
        * @description Called when a column is removed
        * @param oArgs {Object}     Object passed by event
        * @protected
        */       
       _colStatsColumnRemove: function(oArgs) {
            // redraw the tfoot:
            this._colStatsRenderTfoot(true);
            // get rid of the summary data:
            delete(this._colStatsCache[oArgs.column.key]);
       },
       
       /**
        * @method _colStatsRowsAdd
        * @description Called when a row is added
        * @protected
        * @param oArgs {Object}    Object passed by event
        */
       _colStatsRowsAdd: function(oArgs) {
         this._colStatsRowsUpdate(oArgs.records || [oArgs.record], 1);
   
       },
       
       /**
        * @method _colStatsRowsAdd
        * @description Called when a row is deleted
        * @protected
        * @param oArgs {Object}    Object passed by event
        */       
       _colStatsRowsDelete: function(oArgs) {
         this._colStatsRowsUpdate(Lang.isArray(oArgs.oldData) ? oArgs.oldData : [oArgs.oldData], -1);
       },
       
       
       /**
        * @method _colStatsRowsUpdate
        * @description  Updates cached stats when records are added or removed.
        * @param newRecs {Array}   records or object literals of data to add/remove
        * @param change  {Int}     +1 (to add) or -1 (to remove)
        * @private
        */
       _colStatsRowsUpdate: function(newRecs, change) {
            var i = 0,
                rec,
                v,
                vals = this._colStatsCache,
                ds = this.getDataSource(),
                pag = this.get('paginator'),
                cs = this.get('columnStats'),
                col;
            
            // Just go through the new reocrds, adding on new records
            for (; i < newRecs.length; i=i+1) {
            
              if (Lang.isObject(newRecs[i]) && !(newRecs[i] instanceof YAHOO.widget.Record)) {
                // Inconsistencies in datatable - returns different structured
                // object literals for deleteRow and deleteRows
                // but we want Record instances:
                if (newRecs[i]._oData) {
                  newRecs[i] = new YAHOO.widget.Record(newRecs[i]._oData);
                } else {
                  newRecs[i] = new YAHOO.widget.Record(newRecs[i]);
                }
              }


            
              rec = newRecs[i].getData();
              for (col in vals) {
                if (vals.hasOwnProperty(col)) {
                  
                  // Parse the data as necessary and update Record
                  v = ds.parseField(col, rec[col]);
                  newRecs[i].setData(col, v);

                  // If this record is in view, or pagedTotals === false,
                  // we need to add it on:
                  if (cs.pagedTotals === false ||
                      (pag && this.getRecordIndex(newRecs[i]) <= (pag.getPageRecords())[1])) {

                    if (Lang.isNumber(v)) {
                      if (change > 0) {
                        vals[col].stats.addDataValue(v);
                      } else {
                        vals[col].stats.removeDataValue(v);
                      }
                      
                    }
                  }
                  
                }
              }             
            }
    
       }
       
  });
  
  

YAHOO.namespace( "LPLT" );
YAHOO.LPLT.DataTable = lpltTable;

}());