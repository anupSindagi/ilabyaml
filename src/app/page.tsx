"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import Editor from "@monaco-editor/react";
import { Textarea } from "@/components/ui/textarea";
import defaultData from "../data/default.json";

export default function Home() {
  const [yamlOutput, setYamlOutput] = useState("");
  const [version, setVersion] = useState(defaultData.version || "2");
  const [domain, setDomain] = useState(defaultData.domain || "");
  const [createdBy, setCreatedBy] = useState(defaultData.created_by || "");
  const [repo, setRepo] = useState(defaultData.document?.repo || "");
  const [commit, setCommit] = useState(defaultData.document?.commit || "");
  const [patterns, setPatterns] = useState<string[]>(
    defaultData.document?.patterns || [""]
  );
  const [knowledgeSeed, setKnowledgeSeed] = useState(
    defaultData.knowledgeSeed || ""
  );
  const [instructions, setInstructions] = useState("");
  const [systemInstruction, setSystemInstruction] = useState(
    defaultData.systemInstruction || ""
  );
  const [isSystemEditable, setIsSystemEditable] = useState(false);
  const [activeTab, setActiveTab] = useState("system");
  const [isLoading, setIsLoading] = useState(false);

  const addPatternField = () => {
    if (
      defaultData.document?.patterns &&
      patterns.length < defaultData.document.patterns.length
    ) {
      const nextPattern = defaultData.document.patterns[patterns.length];
      setPatterns([...patterns, nextPattern]);
    } else {
      setPatterns([...patterns, ""]);
    }
  };

  const updatePattern = (index: number, value: string) => {
    const newPatterns = [...patterns];
    newPatterns[index] = value;
    setPatterns(newPatterns);
  };

  const removePattern = (index: number) => {
    if (patterns.length > 1) {
      const newPatterns = [...patterns];
      newPatterns.splice(index, 1);
      setPatterns(newPatterns);
    }
  };

  const callOpenAI = async () => {
    try {
      console.log("Calling OpenAI with:", {
        instructionsLength: instructions.length,
        knowledgeSeedLength: knowledgeSeed.length,
      });

      if (!systemInstruction || !knowledgeSeed) {
        console.error("System Instruction and Knowledge Seed are required");
        return null;
      }

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction,
          instructions,
          knowledgeSeed,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("API error:", data.error);
        throw new Error(data.error || "Failed to generate content");
      }

      console.log("API Result:", data.result);
      return data.result;
    } catch (error) {
      console.error("Error generating content:", error);
      return null; // Return null instead of throwing
    }
  };

  const handleGenerateYaml = async () => {
    // Check required fields
    const requiredFields = {
      version,
      domain,
      createdBy,
      repo,
      commit,
      systemInstruction,
      knowledgeSeed,
    };

    const emptyFields = Object.entries(requiredFields)
      .filter(([, value]) => !value.trim())
      .map(([key]) => key);

    if (emptyFields.length > 0) {
      alert(
        `Please fill in the following required fields: ${emptyFields.join(
          ", "
        )}`
      );
      return;
    }

    if (patterns.every((p) => !p.trim())) {
      alert("At least one pattern is required");
      return;
    }

    try {
      // Show loader
      setIsLoading(true);

      // Call OpenAI
      let generatedResult = await callOpenAI();
      // Remove the first and last line if generatedResult exists
      if (generatedResult) {
        // Split the result into lines
        const lines = generatedResult.split("\n");

        // Remove the first and last line if there are at least 3 lines
        // (to ensure we're not removing everything)
        if (lines.length >= 3) {
          lines.shift(); // Remove first line
          lines.pop(); // Remove last line

          // Join the remaining lines back together
          const trimmedResult = lines.join("\n");

          // Update the generatedResult
          generatedResult = trimmedResult;
        }
      }

      // Generate YAML
      const patternsYaml = patterns
        .filter((pattern) => pattern.trim() !== "")
        .map((pattern) => `    - ${pattern}`)
        .join("\n");

      const generatedYaml = `version: ${version || defaultData.version}
domain: ${domain || defaultData.domain}
created_by: ${createdBy || defaultData.created_by}
${generatedResult || ""}
document:
  repo: ${repo || defaultData.document?.repo}
  commit: ${commit || defaultData.document?.commit}
  patterns:
${
  patternsYaml ||
  `    - ${defaultData.document?.patterns?.[0] || "filename.md"}`
}`;

      setYamlOutput(generatedYaml);
    } catch (error) {
      console.error("Error in YAML generation:", error);
      alert("An error occurred while generating YAML");
    } finally {
      // Hide loader regardless of success or failure
      setIsLoading(false);
    }
  };

  const handleDownloadYaml = () => {
    // Create a blob with the YAML content
    const blob = new Blob([yamlOutput], { type: "text/yaml" });

    // Create a URL for the blob
    const url = URL.createObjectURL(blob);

    // Create a temporary anchor element
    const a = document.createElement("a");
    a.href = url;
    a.download = "qna.yaml";

    // Trigger a click on the anchor
    document.body.appendChild(a);
    a.click();

    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClearDefaults = () => {
    setVersion("2");
    setDomain("");
    setCreatedBy("");
    setRepo("");
    setCommit("");
    setPatterns([""]);
    setKnowledgeSeed("");
    setInstructions("");
    // Don't clear system instruction as it's required and technical
  };

  return (
    <div className="container mx-auto py-8 relative">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-t-primary rounded-full animate-spin mb-4"></div>
            <p className="text-lg font-medium">Processing with AI...</p>
            <p className="text-sm text-muted-foreground">
              This may take a moment
            </p>
          </div>
        </div>
      )}

      <h1 className="text-3xl font-bold mb-6">ilabyaml</h1>
      <h2 className="text-xl font-bold mb-6">
        Generate qna.yaml for Instructlab using AI for Taxonomy repository
      </h2>
      <Card>
        <CardHeader>
          <CardTitle>YAML Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Two-column layout */}
          <div className="flex gap-6">
            {/* Left side - Form elements */}
            <div className="flex-1 border-r pr-6 space-y-4">
              <div className="grid w-full gap-1.5">
                <Label htmlFor="version" className="flex items-center">
                  Version <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="version"
                  value={version}
                  placeholder={defaultData.version}
                  onChange={(e) => setVersion(e.target.value)}
                  required
                />
              </div>

              <div className="grid w-full gap-1.5">
                <Label htmlFor="domain" className="flex items-center">
                  Domain <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="domain"
                  placeholder={defaultData.domain}
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  required
                />
              </div>

              <div className="grid w-full gap-1.5">
                <Label htmlFor="created_by" className="flex items-center">
                  Created By <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="created_by"
                  placeholder={defaultData.created_by}
                  value={createdBy}
                  onChange={(e) => setCreatedBy(e.target.value)}
                  required
                />
              </div>

              <div className="grid w-full gap-1.5">
                <Label htmlFor="repo" className="flex items-center">
                  Repository URL <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="repo"
                  placeholder={defaultData.document?.repo}
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  required
                />
              </div>

              <div className="grid w-full gap-1.5">
                <Label htmlFor="commit" className="flex items-center">
                  Commit <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="commit"
                  placeholder={defaultData.document?.commit}
                  value={commit}
                  onChange={(e) => setCommit(e.target.value)}
                  required
                />
              </div>

              <div className="grid w-full gap-1.5">
                <Label className="flex items-center">
                  Patterns <span className="text-red-500 ml-1">*</span>
                </Label>
                <div className="space-y-2">
                  {patterns.map((pattern, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder={
                          defaultData.document?.patterns &&
                          index < defaultData.document.patterns.length
                            ? defaultData.document.patterns[index]
                            : "e.g. filename.md"
                        }
                        value={pattern}
                        onChange={(e) => updatePattern(index, e.target.value)}
                        required={index === 0}
                      />
                      {patterns.length > 1 && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => removePattern(index)}
                          className="shrink-0"
                        >
                          -
                        </Button>
                      )}
                      {index === patterns.length - 1 && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={addPatternField}
                          className="shrink-0"
                        >
                          +
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right side - Tabbed Interface */}
            <div className="flex-1 pl-6 space-y-4">
              {/* Tab navigation */}
              <div className="flex border-b">
                <button
                  className={`px-4 py-2 font-medium ${
                    activeTab === "system"
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => setActiveTab("system")}
                >
                  System Instruction
                </button>
                <button
                  className={`px-4 py-2 font-medium ${
                    activeTab === "user"
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => setActiveTab("user")}
                >
                  User Instructions
                </button>
                <button
                  className={`px-4 py-2 font-medium ${
                    activeTab === "knowledge"
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => setActiveTab("knowledge")}
                >
                  Knowledge Seed
                </button>
              </div>

              {/* Tab content */}
              {activeTab === "system" && (
                <div className="grid w-full gap-1.5">
                  <div className="flex justify-between items-center">
                    <Label
                      htmlFor="system-instruction"
                      className="flex items-center"
                    >
                      System Instruction{" "}
                      <span className="text-red-500 ml-1">*</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        (Don&apos;t change unless necessary)
                      </span>
                    </Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsSystemEditable(!isSystemEditable)}
                    >
                      {isSystemEditable ? "Save" : "Edit"}
                    </Button>
                  </div>
                  <Textarea
                    id="system-instruction"
                    placeholder="System instruction for the AI..."
                    className="min-h-[300px] max-h-[300px] overflow-y-auto resize-none bg-muted"
                    value={systemInstruction}
                    onChange={(e) => setSystemInstruction(e.target.value)}
                    disabled={!isSystemEditable}
                    required
                  />
                </div>
              )}

              {activeTab === "user" && (
                <div className="grid w-full gap-1.5">
                  <Label htmlFor="instructions">User Instructions</Label>
                  <Textarea
                    id="instructions"
                    placeholder="Enter user instructions here..."
                    className="min-h-[300px] max-h-[300px] overflow-y-auto resize-none"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                  />
                </div>
              )}

              {activeTab === "knowledge" && (
                <div className="grid w-full gap-1.5">
                  <Label htmlFor="knowledge-seed" className="flex items-center">
                    Knowledge Seed <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Textarea
                    id="knowledge-seed"
                    placeholder="Paste knowledge seed here or use the default Phoenix constellation data..."
                    className="min-h-[300px] max-h-[300px] overflow-y-auto resize-none"
                    value={knowledgeSeed}
                    onChange={(e) => setKnowledgeSeed(e.target.value)}
                    required
                  />
                </div>
              )}
            </div>
          </div>

          {/* Centered Generate YAML button with information about required fields */}
          <div className="flex flex-col items-center pt-4 gap-2">
            <p className="text-sm text-muted-foreground">
              <span className="text-red-500">*</span> Required fields
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleClearDefaults}>
                Clear default values
              </Button>
              <Button onClick={handleGenerateYaml}>Generate YAML</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {yamlOutput && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex flex-col">
                <span>Generated YAML</span>
                <span className="text-red-500 text-sm font-medium">
                  Please verify the accuracy of the generated data before
                  training!
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(yamlOutput);
                  }}
                >
                  Copy to Clipboard
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDownloadYaml}
                >
                  Download as qna.yaml
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Editor
              height="800px"
              defaultLanguage="yaml"
              value={yamlOutput}
              onChange={(value) => setYamlOutput(value || "")}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: "on",
                wrappingStrategy: "advanced",
                scrollbar: {
                  vertical: "auto",
                  horizontal: "auto",
                  verticalScrollbarSize: 12,
                  horizontalScrollbarSize: 12,
                },
              }}
              className="overflow-hidden rounded-md"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
