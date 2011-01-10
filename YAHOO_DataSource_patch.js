

///////////////////////////////////////////////////////////////
///
/// DataSource additional method
///
/// Allows easy parsing of fields using parsers in responseSchema
///
///////////////////////////////////////////////////////////////



(function() {


var Lang = YAHOO.lang;

       YAHOO.util.DataSourceBase.prototype._parserCache = null;
       
       /**
        * @method parseField
        * @public
        * @description       Provides parsing of a field value at any time.
        * @param String      Key value for the field
        * @param Mixed       Value of the field to parse
        * @return Mixed      Parsed value if parser exists; value as-is if not
        */
      
       YAHOO.util.DataSourceBase.prototype.parseField = function(k, value) {
           
           var i,
               fields = this.responseSchema.fields,
               p,
               pc = this._parserCache;
           
           // build the field-parser cache
           if (pc === undefined || pc === null || pc[k] === undefined) {
             pc = {};
             for (i=0; i<fields.length; i=i+1) {
               
               // Already there - don't need it again
               if (pc[fields[i].key] !== undefined) {
                 continue;
               }
               
               p = undefined;
               
               if (Lang.isObject(fields[i])) {
               
                 p = (typeof fields[i].parser === 'function' ?
                          fields[i].parser :
                          YAHOO.util.DataSource.Parser[fields[i].parser+'']) || fields[i].converter;
                 if (p !== undefined) {
                   pc[fields[i].key] = p;
                 }
               
               }
             }
             this._parserCache = pc;
           }
           
           if (pc[k] !== undefined) {
             return pc[k](value);
           }
           return value;
           
           
         };
       
}());
