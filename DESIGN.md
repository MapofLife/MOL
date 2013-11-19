# UI Design

## Events

We love events! They allow us to decouple many application components in a structured way.

In the UI, application-level events all happen asynchronously using the [event bus](https://github.com/MapofLife/MOL/blob/develop/app/js/mol.bus.js). You can add handler functions to the bus for specific event types, and you can fire events. 

Many events have a layer parameter object, which looks like this:

```javascript
{id, name, source, type}
```

Where `id` is the layer id, `name` is the scientific name, `source` is the layer source, and `type` is the layer type.

### Types

<table>
<tr>
<td><b>Event type</b></td>
<td><b>Description</b></td>
<td><b>Params</b></td>
</tr>
<tr>
<td>layer-toggle</td>
<td>Fired when a map layer visibility is turned on or off.</td>
<td>showing (boolean) | layer</td>
</tr>
<tr>
<td>layer-zoom-extent</td>
<td>Fired when a map layer should be zoomed to its full extent.</td>
<td>layer</td>
</tr></table>

## Engine

## Display
