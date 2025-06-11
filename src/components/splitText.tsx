import React from 'react'
import { motion } from 'framer-motion'

// @ts-ignore
export function SplitText({ children, className, ...rest }: { children: string, [key: string]: any }) {
  let words = children.split(' ')
  // @ts-ignore
  return words.map((word, i) => {
    return (
      <div
        key={children + i}
        style={{ display: 'inline-block', overflow: 'hidden' }}
        className={className ? className : ''}
      >
        <motion.div
          {...rest}
          style={{ display: 'inline-block', willChange: 'transform' }}
          custom={i}
        >
          {word + (i !== words.length - 1 ? '\u00A0' : '')}
        </motion.div>
      </div>
    )
  })
}
