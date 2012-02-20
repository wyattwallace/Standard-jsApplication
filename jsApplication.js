/* <script type="text/javascript" src="//ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js"></script> */

// memoize: a general-purpose function to enable a function to use memoization
//   func: the function to be memoized
//   context: the context for the memoized function to execute within
//   Note: the function must use explicit, primitive parameters (or objects
//     that generate unique strings in a toString() method)
var memoizeFnc = function memoize( func, context ) 
{
  function memoizeArg( argPos ) 
  {
    var cache = { };
    return function( ) 
    {
      var param = arguments[argPos];
      if ( argPos == 0 ) 
      {
        if ( !( param in cache ) ) 
        {
          // console.log( 'cache miss : ' + argPos + ' about to call expensive ajax' );
          //   cache[param] = func.apply(context, arguments);
          rtnData = func.apply(context, arguments);

          // don't want to cache undefined
          if ( rtnData !== undefined )
          {
            cache[param] = rtnData;
          }
          // else { console.log( 'not caching undefined' ); }
        }
        else 
        { 
          console.log( ' ** Returning from cache, no expensive AJAX for you **' ); 
          rtnData = cache[param];
        }

        // return cache[param];
        return rtnData;
      }
      else 
      {
        if ( !( param in cache ) )
        {
          // console.log( 'cache miss : ' + argPos + ' setting cache for ' + param + ' to memoizeArg() func' );
          cache[param] = memoizeArg(argPos - 1);
        }
        // else { console.log( 'cache hit : ' + argPos ); }

        return cache[param].apply(this, arguments);
      }
    }
  }

  // JScript doesn't grok the arity property, but uses length instead
  var arity = func.arity || func.length;

  return memoizeArg( arity - 1 );
}

/**
 * Wrapper for key value pair Data
 *
 * @author Wyatt Wallace <wwallace@myyearbook.com>
 * @constructor
 */
StdDataObject = function( )
{
  /** @type object */
  var data = {};

  /**
   * Set a key value pair
   *
   * @param {string} key
   * @param {string} value
   * @return {void}
   */
  this.setData = function( key, value )
  {
    data[key] = value;
  };

  /**
   * Return object that contains key value pairs
   *
   * @return {object}
   */
  this.getData = function( )
  {
    return data;
  };

  /**
   * Return a hash of all key and value pairs added.
   *
   * @return {string}
   */
  this.toString = function()
  {
    var dataArray = new Array();
    var count = 0;
    for ( var i in data )
    {
      dataArray[count++] = i + ':' + data[i];
    }
    var str = dataArray.join(",");
    return this.hashString( str );
  };

  /**
   * Return hash of string passed in.
   *
   * ToDo: figure out best way to do this
   *
   * @param {string} string to be hashed
   * @return {string}
   */
  this.hashString = function( str )
  {
    return str;
  }
}

/**
 * jsApplication namespace
 *
 * @author Wyatt Wallace <wwallace@myyearbook.com>
 * @constructor
 */
var jsApplication = {};

/**
 * Standard Wrapper for making Ajax calls.
 * Notes:
 *  - setting memoize to true will locally cache ajax calls.  
 *  - memoize must be explicitly set each time.
 *  - doAjax() calls doAjaxSuccess() on success. doAjaxSuccess() must be implemented in concrete class.
 *  - doAjax() calls doAjaxError() on error. doAjaxError() must be implemented in concrete class
 *
 * ToDo:
 *  - create an init() method that checks for doAjaxSuccess and doAjaxError and throw an error if not found.
 *  - create enums for dataType and type and validate input against them
 *  - validate all setters
 *
 * @author Wyatt Wallace <wwallace@myyearbook.com>
 * @constructor
 */
jsApplication.Ajax = function( )
{

  /** @type jsApplication.Ajax */
  var _this = this;
  /** @type string */
  var dataType = 'json';
  /** @type string */
  var type = 'post';
  /** @type boolean */
  var async = true;
  /** @type boolean */
  var memoize = false;
  /** @type ??? memoize function */
  var memoizedAjax = null;
  /** @type object list of channels [success,error] */
  var channels = {};

  /**
   * Set data type used when making Ajax call.
   * (xml, json, script, or html)
   *
   * @param {string} 
   * @return {jsApplication.Ajax}
   */
  this.setDataType = function( dt )
  {
    dataType = dt;
    return _this;
  };

  /**
   * Return data type used when making Ajax call
   *
   * @return {string}
   */
  this.getDataType = function( )
  {
    return dataType;
  };

  /**
   * Set HTTP request method used when making Ajax call.
   * (post, get, put, or delte)
   *
   * @param {string} 
   * @return {jsApplication.Ajax}
   */
  this.setType = function( t )
  {
    type = t;
    return _this;
  };

  /**
   * Return HTTP request method 
   *
   * @return {string}
   */
  this.getType = function( )
  {
    return type;
  };

  /**
   * Set async property. If true Ajax call will be make asynchronously else synchronously.
   *
   * @param {boolean} 
   * @return {jsApplication.Ajax}
   */
  this.setAsync = function( a )
  {
    async = Boolean(a);
    return _this;
  };

  /**
   * Return async property
   *
   * @return {string}
   */
  this.getAsync = function( )
  {
    return async;
  };

  /**
   * Set memoize flag.  If set to true code will cache locally and use data cached if found.
   * Note: this gets reset to false after each doAjax() call.
   *
   * @param {bolean} 
   * @return {jsApplication.Ajax}
   */
  this.setShouldMemoize = function( bool )
  {
    memoize = Boolean(bool);
    return _this;
  };

  /**
   * Reset memoize flag
   *
   * @return {void}
   */
  this.resetMemoize = function( )
  {
    memoize = false;
  };

  this.subscribe = function( channel, context, fn )
  {
    if ( ! channels[channel] )
    {
      channels[channel] = {};
    }

    channels[channel] = { context: context, callback: fn };
    
    return _this;
  };

  /**
   * Method wraps ajax call funcationality.
   *
   * ToDo:
   *  - validate that data is of type StdDataObject
   *
   * @param {string} url
   * @param {StdDataObject}
   * @return {jsApplication.Ajax}
   */
  this.doAjax = function( url, data )
  {
    var rtnData = undefined;
    if ( memoize )
    {
      if ( memoizedAjax === null )
      {
        memoizedAjax = memoizeFnc( _this._doAjax, _this );
      }

      rtnData = memoizedAjax( url, data );
    }
    else
    {
      rtnData = _this._doAjax( url, data );
    }
  
    // not calling doAjaxSuccess if rtnData = undefined
    if ( rtnData !== undefined )
    {
      this.publish( 'success', rtnData );
    }
    // else { console.log( 'not calling doAjaxSuccess bc rtnData = undefined' ); }

    // do not want to persist memoizer flag. dev has to call it each time explicitly
    _this.resetMemoize( );
    return this;
  };

  /**
   * Method performs Ajax call
   *
   * Notes:
   *  memoizer - i need this to be publicly callable so that it can get called from memoizer
   *  memoizer - this function has to return something for the memoizer to work!
   *             we need to return what comes back from success so that it can get 
   *             cached in memoizer
   *
   * @param {string} url
   * @param {StdDataObject}
   * @return {mixed} value passed back from server or undefined
   */
  this._doAjax = function( url, data )
  {
    // console.log( 'doing expensive ajax call, yikes!' );

    // IMPORTANT - this function has to return something for the memoizer to work!
    // we need to return what comes back from success so that it can get 
    // cached in memoizer
    var rtnData = undefined;
    num = 0;

    d = data.getData();

    for ( var i in d )
    {
      num = num + parseInt( d[i], 10 );
    }

    if ( num < 0 )
    {
      // console.log( 'in _doAjax in error condition bc num = ' + num );
      this.publish( 'error', 'abc123' );
      return rtnData;
    }
    rtnData = num;


/*
    $.ajax({
      url: url,
      data: data,
      async: this.getAsync( ),
      dataType:  this.getDataType( ),
      type: this.getType( ),
      success: function( data )
      {
        this.publish( 'success', data );
        rtnData = data;
      },
      error: function( xhr, textStatus, errorThrown )
      {
        this.publish( 'error', xhr, textStatus, errorThrown );
      }
    });
*/

    return rtnData;
  };

  // Publish/broadcast an event to the rest of the application
  this.publish = function( channel )
  {
    if ( ! channels[channel] ) 
    {
      return false;
    }

    var args = Array.prototype.slice.call(arguments, 1);
    var subscription = channels[channel];
    subscription.callback.apply(subscription.context, args);

    return _this;
  };

};
