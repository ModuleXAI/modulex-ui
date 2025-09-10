'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Toggle } from '@/components/ui/toggle'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ToolInvocation } from 'ai'
import { ArrowRight, Check, ChevronDown, SkipForward } from 'lucide-react'
import { useState } from 'react'

interface QuestionConfirmationProps {
  toolInvocation: ToolInvocation
  onConfirm: (toolCallId: string, approved: boolean, response?: any) => void
  isCompleted?: boolean
}

interface QuestionOption {
  value: string
  label: string
}

export function QuestionConfirmation({
  toolInvocation,
  onConfirm,
  isCompleted = false
}: QuestionConfirmationProps) {
  const { question, options, allowsInput, inputLabel, inputPlaceholder } =
    toolInvocation.args

  // Get result data if available
  const resultData =
    toolInvocation.state === 'result' && toolInvocation.result
      ? toolInvocation.result
      : null

  const [selectedOptions, setSelectedOptions] = useState<string[]>([])
  const [inputText, setInputText] = useState('')
  const [completed, setCompleted] = useState(isCompleted)
  const [skipped, setSkipped] = useState(false)

  const selectedCount = selectedOptions.length

  const isButtonDisabled =
    selectedOptions.length === 0 && (!allowsInput || inputText.trim() === '')

  const handleOptionToggle = (label: string) => {
    setSelectedOptions(previouslySelectedOptions => {
      if (previouslySelectedOptions.includes(label)) {
        return previouslySelectedOptions.filter(optionLabel => optionLabel !== label)
      }
      return [...previouslySelectedOptions, label]
    })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value)
  }

  const handleSkip = () => {
    setSkipped(true)
    setCompleted(true)
    onConfirm(toolInvocation.toolCallId, false, { skipped: true })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const response = {
      selectedOptions,
      inputText: inputText.trim(),
      question
    }

    onConfirm(toolInvocation.toolCallId, true, response)
    setCompleted(true)
  }

  // Get options to display (from result or local state)
  const getDisplayedOptions = (): string[] => {
    if (resultData && Array.isArray(resultData.selectedOptions)) {
      return resultData.selectedOptions
    }
    return selectedOptions
  }

  // Get input text to display (from result or local state)
  const getDisplayedInputText = (): string => {
    if (resultData && resultData.inputText) {
      return resultData.inputText
    }
    return inputText
  }

  // Check if question was skipped
  const wasSkipped = (): boolean => {
    if (resultData && resultData.skipped) {
      return true
    }
    return skipped
  }

  const updatedQuery = () => {
    // If skipped, show skipped message
    if (wasSkipped()) {
      return 'Question skipped'
    }

    const displayOptions = getDisplayedOptions()
    const displayInputText = getDisplayedInputText()

    const optionsText =
      displayOptions.length > 0 ? `Selected: ${displayOptions.join(', ')}` : ''

    const inputTextDisplay =
      displayInputText.trim() !== '' ? `Input: ${displayInputText}` : ''

    return [optionsText, inputTextDisplay].filter(Boolean).join(' | ')
  }

  // Show result view if completed or if tool has result state
  if (completed || toolInvocation.state === 'result') {
    const isSkipped = wasSkipped()

    return (
      <Card className="p-2 md:p-3 w-full mb-3">
        <Collapsible>
          <div className="flex items-center justify-between gap-2 min-h-10">
            <div className="min-w-0 flex-1">
              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                {isSkipped ? (
                  <>
                    <Badge variant="secondary" className="flex items-center gap-1 px-2 py-0.5">
                      <SkipForward size={12} className="text-yellow-600" />
                      Skipped
                    </Badge>
                    <span className="text-xs text-muted-foreground truncate">{question}</span>
                  </>
                ) : (
                  <Check size={14} className="text-green-600" />
                )}
                {!isSkipped && getDisplayedOptions().slice(0, 3).map(optionLabel => (
                  <Badge
                    key={optionLabel}
                    variant="outline"
                    className="px-3 py-1 rounded-md font-normal border-transparent ring-1 ring-border dark:ring-white/20 bg-background/60 dark:bg-background/40"
                  >
                    {optionLabel}
                  </Badge>
                ))}
                {!isSkipped && getDisplayedOptions().length > 3 && (
                  <Badge
                    variant="outline"
                    className="px-3 py-1 rounded-md font-normal border-transparent ring-1 ring-border dark:ring-white/20 bg-background/60 dark:bg-background/40"
                  >
                    +{getDisplayedOptions().length - 3}
                  </Badge>
                )}
                {!isSkipped && getDisplayedInputText().trim() !== '' && (
                  <Badge
                    variant="outline"
                    className="px-3 py-1 rounded-md font-normal border-transparent ring-1 ring-border dark:ring-white/20 bg-background/60 dark:bg-background/40 truncate max-w-[12rem]"
                  >
                    {getDisplayedInputText()}
                  </Badge>
                )}
              </div>
            </div>
            {!isSkipped && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
            )}
          </div>
          {!isSkipped && (
            <CollapsibleContent>
              <Separator className="my-2" />
              <div className="text-xs text-muted-foreground break-words">
                <div className="font-medium mb-1">{question}</div>
                {updatedQuery() || 'No additional details'}
              </div>
            </CollapsibleContent>
          )}
        </Collapsible>
      </Card>
    )
  }

  return (
    <Card className="mb-3">
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm md:text-base truncate">{question}</CardTitle>
            <div className="mt-1 text-xs text-muted-foreground">
              {selectedCount > 0 ? `${selectedCount} selected` : 'Provide details'}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 pt-0">
        <form onSubmit={handleSubmit} className="space-y-4">
          {options && options.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Select options</span>
                {selectedCount > 0 && (
                  <Badge variant="secondary" className="px-2 py-0.5 text-[10px]">{selectedCount} selected</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {options.map((option: QuestionOption, index: number) => {
                  const isPressed = selectedOptions.includes(option.label)
                  return (
                    <Toggle
                      key={`option-${index}`}
                      size="sm"
                      variant="outline"
                      pressed={isPressed}
                      onPressedChange={() => handleOptionToggle(option.label)}
                      aria-label={option.label}
                    >
                      {isPressed && <Check size={14} />}
                      <span className="truncate text-xs">{option.label}</span>
                    </Toggle>
                  )
                })}
              </div>
            </div>
          )}

          {allowsInput && (
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs" htmlFor="question-free-input">
                {inputLabel}
              </Label>
              <Input
                id="question-free-input"
                type="text"
                name="additional_query"
                className="w-full h-8 text-xs"
                placeholder={inputPlaceholder}
                value={inputText}
                onChange={handleInputChange}
              />
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between min-h-10">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="outline" size="sm" onClick={handleSkip}>
                    <SkipForward size={14} className="mr-1" />
                    Skip
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Answer later and continue</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button type="submit" size="sm" disabled={isButtonDisabled}>
              <ArrowRight size={14} className="mr-1" />
              Send
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
