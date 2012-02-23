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

    JSON.stringify = JSON.stringify || function( str ) { return str; };

    return JSON.stringify( str );
  };

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
 *
 * ToDo:
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
   * @constant
   * @type Object
   * @enum {string}
   */
  var channelsMap = { SUCCESS: 'success',
                      ERROR: 'error',
                      BEFORE_SEND: 'before_send',
                      COMPLETE: 'complete',
                      STATUS_CODE_404: 'status_code_404' };

  /**
   * Private function to reset class.  Called after each Ajax request.  
   * Sets {@link memoize} to false, and {@link channels} to an empty object.
   * Called from {@link doAjax()} 
   *
   * @return {void}
   */
  function reset( )
  {
    memoize = false;
    channels = { };

    console.log( '------------' );
  };

  /**
   * Set data type used when making Ajax call.
   * (xml, json, script, or html)
   *
   * @param {string} 
   * @return {jsApplication.Ajax}
   */
  this.setDataType = function( dt )
  {
    /**
     * @constant
     * @type Object
     * @enum {string}
     */
    var dataTypeMap = { XML: 'xml',
                        JSON: 'json',
                        SCRIPT: 'script',
                        HTML: 'html' };

    if ( ! dataTypeMap.hasOwnProperty( dt ) )
    {
      throw new TypeError( "Invalid Data Type: " + dt );
    }

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
    /**
     * @constant
     * @type Object
     * @enum {string}
     */
    var typeMap = { POST: 'post',
                    GET: 'get',
                    PUT: 'put',
                    DELETE: 'delete' };

    if ( ! typeMap.hasOwnProperty( t ) )
    {
      throw new TypeError( "Invalid Type: " + t );
    }

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
  this.setAsync = function( bool )
  {
    async = Boolean( bool );
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
   * Set a callback for one of the supported channels
   *
   * @param {string}
   * @param {object}
   * @param {function} 
   * @return {jsApplication.Ajax}
   */
  this.subscribe = function( ch, context, fn )
  {
    if ( ! channelsMap.hasOwnProperty( ch ) )
    {
      throw new TypeError( "Invalid Channel, can not subscribe to: " + ch );
    }

    var channel = channelsMap[ch];

    if ( ! channels[channel] )
    {
      channels[channel] = [];
    }

    // loop over channels and do not set the same callback twice
    for ( var i = 0, l = channels[channel].length; i < l; i++ )
    {
      var subscription = channels[channel][i]
      if ( subscription.context == context && subscription.callback == fn )
      {
        // do not set twice
        return _this;
      }
    }

    channels[channel].push({ context: context, callback: fn });    

    return _this;
  };

  /**
   * Method wraps ajax call funcationality.
   *
   * @param {string} 
   * @param {mixed}
   * @return {jsApplication.Ajax}
   */
  this.doAjax = function( url, data )
  {
    var ajaxData = '';
    var dType = typeof data;

    if ( dType !== 'object' )
    {
      ajaxData = data;
      console.log( 'Data passed in is not an object so we are not going to try to cache locally' );
      memozie = false;
    }
    else
    {
      if ( data instanceof StdDataObject )
      {
        ajaxData = data;
      }
      else
      {
        ajaxData = new StdDataObject( );
        for ( x in data )
        {
          ajaxData.setData( x, data[x] );
        }
      }
    }

    var rtnData = undefined;
    if ( memoize )
    {
      if ( memoizedAjax === null )
      {
        memoizedAjax = memoizeFnc( _this._doAjax, _this );
      }

      rtnData = memoizedAjax( url, ajaxData );
    }
    else
    {
      rtnData = _this._doAjax( url, ajaxData );
    }
  
    // not calling doAjaxSuccess if rtnData = undefined
    if ( rtnData !== undefined )
    {
      this.publish( channelsMap.SUCCESS, rtnData );
    }
    // else { console.log( 'not calling doAjaxSuccess bc rtnData = undefined' ); }

    // do not want to persist memoizer flag. dev has to call it each time explicitly
    reset( );
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
      this.publish( channelsMap.ERROR, 'My Test Error Message' );
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
        this.publish( channelsMap.SUCCESS, data );
        rtnData = data;
      },
      complete: function( jqXHR, textStatus )
      {
        this.publish( channelsMap.COMPLETE, textStatus );
      },
      error: function( xhr, textStatus, errorThrown )
      {
        this.publish( channelsMap.ERROR, xhr, textStatus, errorThrown );
      },
      statusCode: {
        404: function() {
          this.publish( channelsMap.STATUS_CODE_404 );
        }
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

    var args = Array.prototype.slice.call( arguments, 1 );

    for ( var i = 0, l = channels[channel].length; i < l; i++ )
    {
      var subscription = channels[channel][i];
      subscription.callback.apply( subscription.context, args );
    }

    return _this;
  };

};
