import React, { PureComponent } from 'react'
import { Connect } from 'react-state'
import { Animate } from './ReactMove'
//
import Utils from '../utils/Utils'
import Selectors from '../utils/Selectors'
import { selectSeries, hoverSeries, selectDatum, hoverDatum } from '../utils/interactionMethods'

import Rectangle from '../primitives/Rectangle'

class Bars extends PureComponent {
  constructor () {
    super()
    this.selectSeries = selectSeries.bind(this)
    this.hoverSeries = hoverSeries.bind(this)
    this.selectDatum = selectDatum.bind(this)
    this.hoverDatum = hoverDatum.bind(this)
  }
  static plotDatum = (datum, {
    xScale, yScale, primaryAxis, xAxis, yAxis,
  }) => {
    datum.x = xScale(datum.xValue)
    datum.y = yScale(datum.yValue)
    datum.base = primaryAxis.vertical ? xScale(datum.baseValue) : yScale(datum.baseValue)

    // Set the default focus point
    datum.focus = {
      x: datum.x,
      y: datum.y,
    }

    // Adjust the focus point for bars
    if (!xAxis.vertical) {
      datum.focus.x = datum.x + xAxis.tickOffset
    }
    if (!yAxis.vertical) {
      datum.focus.y = datum.y + yAxis.tickOffset
    }

    // Set the cursor points (used in voronoi)
    datum.cursorPoints = [
      // End of bar
      datum.focus,
      // Start of bar
      {
        x: primaryAxis.vertical
          ? primaryAxis.position === 'left' ? datum.base - 1 : datum.base
          : datum.focus.x,
        y: !primaryAxis.vertical
          ? primaryAxis.position === 'bottom' ? datum.base - 1 : datum.base
          : datum.focus.y,
      },
    ]
  }
  static buildStyles = (series, { getStyles, getDataStyles, defaultColors }) => {
    const defaults = {
      // Pass some sane defaults
      color: defaultColors[series.index % (defaultColors.length - 1)],
    }

    series.statusStyles = Utils.getStatusStyles(series, getStyles, defaults)

    // We also need to decorate each datum in the same fashion
    series.data.forEach(datum => {
      datum.statusStyles = Utils.getStatusStyles(datum, getDataStyles, {
        ...series.statusStyles.default,
        ...defaults,
      })
    })
  }
  render () {
    const {
      series,
      visibility,
      //
      primaryAxis,
      selected,
      hovered,
      interaction,
    } = this.props

    const status = Utils.seriesStatus(series, hovered, selected)
    const style = Utils.getStatusStyle(status, series.statusStyles)

    const barSize = primaryAxis.barSize
    const barOffset = primaryAxis.barOffset

    const data = series.data.map(d => ({
      x: d.x,
      y: d.y,
      r: d.r,
      base: d.base,
    }))

    return (
      <Animate
        start={{
          data,
          barSize,
          barOffset,
        }}
        update={{
          data: [data],
          barSize: [barSize],
          barOffset: [barOffset],
        }}
      >
        {inter => {
          const seriesInteractionProps =
            interaction === 'series'
              ? {
                  onClick: () => this.selectSeries(series),
                  onMouseEnter: () => this.hoverSeries(series),
                  onMouseMove: () => this.hoverSeries(series),
                  onMouseLeave: () => this.hoverSeries(null),
                }
              : {}
          return (
            <g className="series bar">
              {series.data.map((datum, i) => {
                const x = inter.data[i] ? inter.data[i].x : 0
                const y = inter.data[i] ? inter.data[i].y : 0
                const base = inter.data[i] ? inter.data[i].base : 0
                let x1
                let y1
                let x2
                let y2
                if (primaryAxis.vertical) {
                  x1 = base
                  x2 = x
                  y1 = y + inter.barOffset
                  y2 = y1 + inter.barSize
                } else {
                  x1 = x + inter.barOffset
                  x2 = x1 + inter.barSize
                  y1 = y
                  y2 = base
                }

                const status = Utils.datumStatus(series, datum, hovered, selected)
                const dataStyle = Utils.getStatusStyle(status, datum.statusStyles)

                const datumInteractionProps =
                  interaction === 'element'
                    ? {
                        onClick: () => this.selectDatum(datum),
                        onMouseEnter: () => this.hoverDatum(datum),
                        onMouseMove: () => this.hoverDatum(datum),
                        onMouseLeave: () => this.hoverDatum(null),
                      }
                    : {}

                return (
                  <Rectangle
                    style={{
                      ...style,
                      ...style.rectangle,
                      ...dataStyle,
                      ...dataStyle.rectangle,
                    }}
                    key={i}
                    x1={Number.isNaN(x1) ? null : x1}
                    y1={Number.isNaN(y1) ? null : y1}
                    x2={Number.isNaN(x2) ? null : x2}
                    y2={Number.isNaN(y2) ? null : y2}
                    opacity={visibility}
                    {...seriesInteractionProps}
                    {...datumInteractionProps}
                  />
                )
              })}
            </g>
          )
        }}
      </Animate>
    )
  }
}

export default Connect(
  () => {
    const selectors = {
      primaryAxis: Selectors.primaryAxis(),
    }
    return state => ({
      primaryAxis: selectors.primaryAxis(state),
      hovered: state.hovered,
      selected: state.selected,
      interaction: state.interaction,
    })
  },
  {
    filter: (oldState, newState, meta) => meta.type !== 'cursor',
    statics: {
      SeriesType: 'Bar',
    },
  }
)(Bars)
