import { useState } from "react";
import ASCIIText from "../blocks/TextAnimations/ASCIIText/ASCIIText"

export default function WritingMode() {



  return (
      <ASCIIText
        text="currently in development"
        asciiFontSize={10}
        textFontSize={15}
        enableWaves={false}
        textColor="#40c4f0"
      />
 
  );
}