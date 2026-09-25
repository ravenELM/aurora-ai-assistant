# Aurora AI Assistant

Create a new project with AI enabled.

build a website a chatbot etc  named aurora  and use  database to create database and we login with google or email and  use this gardient at start  You are given a task to integrate an existing React component in the codebase

The codebase should support:
- shadcn project structure  
- Tailwind CSS
- Typescript

If it doesn't, provide instructions on how to setup project via shadcn CLI, install Tailwind or Typescript.

Determine the default path for components and styles. 
If default path for components is not /components/ui, provide instructions on why it's important to create this folder
Copy-paste this component to /components/ui folder:
```tsx
animated-gradient-background.tsx
import { motion } from "framer-motion";
import React, { useEffect, useRef } from "react";

interface AnimatedGradientBackgroundProps {
   /** 
    * Initial size of the radial gradient, defining the starting width. 
    * @default 110
    */
   startingGap?: number;

   /**
    * Enables or disables the breathing animation effect.
    * @default false
    */
   Breathing?: boolean;

   /**
    * Array of colors to use in the radial gradient.
    * Each color corresponds to a stop percentage in `gradientStops`.
    * @default ["#0A0A0A", "#2979FF", "#FF80AB", "#FF6D00", "#FFD600", "#00E676", "#3D5AFE"]
    */
   gradientColors?: string[];

   /**
    * Array of percentage stops corresponding to each color in `gradientColors`.
    * The values should range between 0 and 100.
    * @default [35, 50, 60, 70, 80, 90, 100]
    */
   gradientStops?: number[];

   /**
    * Speed of the breathing animation. 
    * Lower values result in slower animation.
    * @default 0.02
    */
   animationSpeed?: number;

   /**
    * Maximum range for the breathing animation in percentage points.
    * Determines how much the gradient "breathes" by expanding and contracting.
    * @default 5
    */
   breathingRange?: number;

   /**
    * Additional inline styles for the gradient container.
    * @default {}
    */
   containerStyle?: React.CSSProperties;

   /**
    * Additional class names for the gradient container.
    * @default ""
    */
   containerClassName?: string;

   /**
    * Additional top offset for the gradient container form the top to have a more flexible control over the gradient.
    * @default 0
    */
   topOffset?: number;
}

/**
 * AnimatedGradientBackground
 *
 * This component renders a customizable animated radial gradient background with a subtle breathing effect.
 * It uses `framer-motion` for an entrance animation and raw CSS gradients for the dynamic background.
 *
 *
 * @param {AnimatedGradientBackgroundProps} props - Props for configuring the gradient animation.
 * @returns JSX.Element
 */
const AnimatedGradientBackground: React.FC<AnimatedGradientBackgroundProps> = ({
   startingGap = 125,
   Breathing = false,
   gradientColors = [
      "#0A0A0A",
      "#2979FF",
      "#FF80AB",
      "#FF6D00",
      "#FFD600",
      "#00E676",
      "#3D5AFE"
   ],
   gradientStops = [35, 50, 60, 70, 80, 90, 100],
   animationSpeed = 0.02,
   breathingRange = 5,
   containerStyle = {},
   topOffset = 0,
   containerClassName = "",
}) => {

   // Validation: Ensure gradientStops and gradientColors lengths match
   if (gradientColors.length !== gradientStops.length) {
      throw new Error(
         `GradientColors and GradientStops must have the same length.
     Received gradientColors length: ${gradientColors.length},
     gradientStops length: ${gradientStops.length}`
      );
   }

   const containerRef = useRef<HTMLDivElement | null>(null);

   useEffect(() => {
      let animationFrame: number;
      let width = startingGap;
      let directionWidth = 1;

      const animateGradient = () => {
         if (width >= startingGap + breathingRange) directionWidth = -1;
         if (width <= startingGap - breathingRange) directionWidth = 1;

         if (!Breathing) directionWidth = 0;
         width += directionWidth * animationSpeed;

         const gradientStopsString = gradientStops
            .map((stop, index) => `${gradientColors[index]} ${stop}%`)
            .join(", ");

         const gradient = `radial-gradient(${width}% ${width+topOffset}% at 50% 20%, ${gradientStopsString})`;

         if (containerRef.current) {
            containerRef.current.style.background = gradient;
         }

         animationFrame = requestAnimationFrame(animateGradient);
      };

      animationFrame = requestAnimationFrame(animateGradient);

      return () => cancelAnimationFrame(animationFrame); // Cleanup animation
   }, [startingGap, Breathing, gradientColors, gradientStops, animationSpeed, breathingRange, topOffset]);

   return (
      <motion.div
         key="animated-gradient-background"
         initial={{
            opacity: 0,
            scale: 1.5,
         }}
         animate={{
            opacity: 1,
            scale: 1,
            transition: {
               duration: 2,
               ease: [0.25, 0.1, 0.25, 1], // Cubic bezier easing
             },
         }}
         className={`absolute inset-0 overflow-hidden ${containerClassName}`}
      >
         <div
            ref={containerRef}
            style={containerStyle}
            className="absolute inset-0 transition-transform"
         />
      </motion.div>
   );
};

export default AnimatedGradientBackground;

demo.tsx
"use client"
import AnimatedGradientBackground from "@/components/ui/animated-gradient-background";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { AnimatePresence, motion, useInView, Variants } from "framer-motion";
import { useRef } from "react";

const DemoVariant1 = () => {
  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Gradient Background */}
      <AnimatedGradientBackground />

      <div className="relative z-10 flex flex-col items-center justify-start h-full px-4 pt-32 text-center">
        <div delay={0.4}
          duration={0.9}
        >
          <DotLottieReact
            src="https://lottie.host/8cf4ba71-e5fb-44f3-8134-178c4d389417/0CCsdcgNIP.json"
            loop
            autoplay
          />
        </div>
          <p className="mt-4 text-lg text-gray-300 md:text-xl max-w-lg">
            A customizable animated radial gradient background with a subtle
            breathing effect.
          </p>
      </div>
    </div>
  );
};

export { DemoVariant1 };

```

Install NPM dependencies:
```bash
framer-motion, @lottiefiles/dotlottie-react
```

Implementation Guidelines
 1. Analyze the component structure and identify all required dependencies
 2. Review the component's argumens and state
 3. Identify any required context providers or hooks and install them
 4. Questions to Ask
 - What data/props will be passed to this component?
 - Are there any specific state management requirements?
 - Are there any required assets (images, icons, etc.)?
 - What is the expected responsive behavior?
 - What is the best place to use this component in the app?

Steps to integrate
 0. Copy paste all the code above in the correct directories
 1. Install external dependencies
 2. Fill image assets with Unsplash stock images you know exist
 3. Use lucide-react icons for svgs or logos if component requires them
 So i dont want you to use a costly model use gpt 5.6 sol for building so i dont use manu credits and so when we open the app and use is not logged it will be the gardient from the code i give you and meet aurora and a next rounded button then it will say like aurora is a all in one chatbot that helps you manage your calendar, email and many more… and add a onboarding of steps and with the gardient and after user finishes it with will be the sign in page or create acount….  Adter user signs in etc it will be a chat when ai talks add this animatiom npx shadcn@latest add "@assistant-ui/elements-streaming-text"npx shadcn@latest add "@assistant-ui/elements-message-pair"   npx shadcn@latest add "@assistant-ui/elements-message-branches" npx shadcn@latest add "@assistant-ui/elements-message-actions" npx shadcn@latest add "@assistant-ui/elements-edit-message" npx shadcn@latest add "@assistant-ui/elements-day-separator" npx shadcn@latest add "@assistant-ui/elements-tool-call"npx shadcn@latest add "@assistant-ui/elements-web-search" npx shadcn@latest add "@assistant-ui/elements-activity-graph" npx shadcn@latest add "@assistant-ui/elements-quota-banner" npx shadcn@latest add "@assistant-ui/elements-composer" npx shadcn@latest add "@assistant-ui/elements-composer" npx shadcn@latest add "@assistant-ui/elements-composer" npx shadcn@latest add "@assistant-ui/tool-fallback" pnpm dlx shadcn add @smoothui/blur-out-up @smoothui/shine-text @smoothui/soft-blur-in @smoothui/ai-branch @smoothui/ai-citation @smoothui/ai-loader @smoothui/ai-response @smoothui/ai-sources @smoothui/ai-reasoning use all these i gave you for the best ui we make it identical to chatgpt with setitings memory personalization and plugins we use composio.dev for plugins COMPOSIO_API_KEY=ak_LrwykPiK99zaZjlfZTpL npx skills add ComposioHQ/composio --skill composio -y  Use the $composio skill to get Composio working in this codebase.

Help me connect an integration and make my first real tool call.
When it works, show me what changed and what I can try next. And we can generate images talk to ai ai can acces composio we have @plugin like @google calwndaee etc… / cmds make it nice nice
So use the gardient animation and onboarding and google login or apple if you can tok and email too use the components @secret:GOOGLE_OAUTH_CLIENT_ID  @secret:GOOGLE_OAUTH_CLIENT_SECRET 
 Let me know redirect url i need to set also besides ai use jev ai too make sure to use my components and composio

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://aurora-ai-buddy-48.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5bcf0923-9b6e-4ee6-bc6f-42ea0381d836).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
