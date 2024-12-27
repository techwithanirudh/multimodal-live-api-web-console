/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { type FunctionDeclaration, SchemaType } from "@google/generative-ai";
import { useEffect, useRef, useState, memo } from "react";
import vegaEmbed from "vega-embed";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { ToolCall } from "../../multimodal-live-types";

const declaration: FunctionDeclaration = {
  name: "render_altair",
  description: "Displays an altair graph in json format.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      json_graph: {
        type: SchemaType.STRING,
        description:
          "JSON STRING representation of the graph to render. Must be a string, not a json object",
      },
    },
    required: ["json_graph"],
  },
};

function AltairComponent() {
  const [jsonString, setJSONString] = useState<string>("");
  const { client, setConfig } = useLiveAPIContext();

  useEffect(() => {
    setConfig({
      model: "models/gemini-2.0-flash-exp",
      generationConfig: {
        responseModalities: "audio",
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
        },
      },
      systemInstruction: {
        parts: [
          {
            text: `You are an upbeat, encouraging tutor who helps students understand concepts by explaining 
ideas and asking students questions. Start by introducing yourself to the student as their AI-Tutor 
who is happy to help them with any questions. Only ask one question at a time. First, ask them 
what they would like to learn about. Wait for the response. Then ask them about their learning 
level: Are you a high school student, a college student or a professional? Wait for their response. 
Then ask them what they know already about the topic they have chosen. Wait for a response. 
Given this information, help students understand the topic by providing explanations, examples, 
analogies. These should be tailored to students learning level and prior knowledge or what they 
already know about the topic.Give students explanations, examples, and analogies about the concept to help them understand. 
You should guide students in an open-ended way. Do not provide immediate answers or 
solutions to problems but help students generate their own answers by asking leading questions. 
Ask students to explain their thinking. If the student is struggling or gets the answer wrong, try 
asking them to do part of the task or remind the student of their goal and give them a hint. If 
students improve, then praise them and show excitement. If the student struggles, then be 
encouraging and give them some ideas to think about. When pushing students for information, 
try to end your responses with a question so that students have to keep generating ideas. Once a 
student shows an appropriate level of understanding given their learning level, ask them to 
explain the concept in their own words; this is the best way to show you know something, or ask 
them for examples. When a student demonstrates that they know the concept you can move the 
conversation to a close and tell them you're here to help if they have further questions. 
Any time I ask you for a graph call the "render_altair" function I have provided you.`
          },
        ],
      },
      tools: [
        // there is a free-tier quota for search
        { googleSearch: {} },
        { functionDeclarations: [declaration] },
      ],
    });
  }, [setConfig]);

  useEffect(() => {
    const onToolCall = (toolCall: ToolCall) => {
      console.log(`got toolcall`, toolCall);
      const fc = toolCall.functionCalls.find(
        (fc) => fc.name === declaration.name,
      );
      if (fc) {
        const str = (fc.args as any).json_graph;
        setJSONString(str);
      }
      // send data for the response of your tool call
      // in this case Im just saying it was successful
      if (toolCall.functionCalls.length) {
        setTimeout(
          () =>
            client.sendToolResponse({
              functionResponses: toolCall.functionCalls.map((fc) => ({
                response: { output: { sucess: true } },
                id: fc.id,
              })),
            }),
          200,
        );
      }
    };
    client.on("toolcall", onToolCall);
    return () => {
      client.off("toolcall", onToolCall);
    };
  }, [client]);

  const embedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (embedRef.current && jsonString) {
      vegaEmbed(embedRef.current, JSON.parse(jsonString));
    }
  }, [embedRef, jsonString]);
  return <div className="vega-embed" ref={embedRef} />;
}

export const Altair = memo(AltairComponent);
