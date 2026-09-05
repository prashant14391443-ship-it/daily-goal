"use client";

import { supabase } from "@/lib/supabase";

export type ActionType = 
  | "log_study"
  | "log_workout"
  | "log_habit"
  | "log_calories"
  | "add_task"
  | "chat";

export interface ParsedAction {
  action: ActionType;
  data: Record<string, any>;
  reply: string;
}

function toLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Parses natural language voice commands into structured actions
 * and executes them against Supabase.
 */
export async function executeVoiceAction(
  message: string,
  userId: string
): Promise<ParsedAction> {
  const lowerMsg = message.toLowerCase();
  const today = toLocalISO(new Date());

  //  STUDY LOG
  const studyMatch = lowerMsg.match(/(?:studied|study|read|reading)\s+(?:for\s+)?(\d+)\s*(?:min|minute)/);
  if (studyMatch) {
    const minutes = parseInt(studyMatch[1], 10);
    try {
      const { error } = await supabase
        .from("study_sessions")
        .insert({
          user_id: userId,
          session_date: today,
          duration_minutes: minutes,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;
      return {
        action: "log_study",
        data: { minutes },
        reply: `✅ Logged ${minutes} minutes of study. Great focus today!`,
      };
    } catch (err) {
      console.error("Study log error:", err);
      return {
        action: "log_study",
        data: { minutes },
        reply: `I tried to log ${minutes} minutes of study, but hit a snag. Try again?`,
      };
    }
  }

  // 🏋️ WORKOUT LOG
  const workoutMatch = lowerMsg.match(/(?:did|completed|finished|worked out)\s+(.+?)(?:\s+for\s+(\d+)\s*min)?$/);
  if (workoutMatch && (lowerMsg.includes("workout") || lowerMsg.includes("exercise") || lowerMsg.includes("gym") || lowerMsg.includes("pushup") || lowerMsg.includes("run"))) {
    const exercise = workoutMatch[1].replace(/for\s+\d+\s*min$/, "").trim();
    const duration = workoutMatch[2] ? parseInt(workoutMatch[2], 10) : 30;
    
    try {
      const { error } = await supabase
        .from("gym_logs")
        .insert({
          user_id: userId,
          session_date: today,
          exercise_type: exercise,
          duration_minutes: duration,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;
      return {
        action: "log_workout",
        data: { exercise, duration },
        reply: `💪 Logged your ${exercise} workout for ${duration} minutes. You're crushing it!`,
      };
    } catch (err) {
      console.error("Workout log error:", err);
      return {
        action: "log_workout",
        data: { exercise, duration },
        reply: `I tried to log your workout but something went wrong.`,
      };
    }
  }

  // ✅ HABIT COMPLETION
  const habitMatch = lowerMsg.match(/(?:completed|did|finished|done with)\s+(?:my\s+)?(?:habit\s+)?(.+?)(?:\s+today)?$/);
  if (habitMatch && (lowerMsg.includes("habit") || lowerMsg.includes("completed"))) {
    const habitName = habitMatch[1].trim();
    
    try {
      // First find the habit
      const { data: habit, error: habitError } = await supabase
        .from("habits")
        .select("id")
        .eq("user_id", userId)
        .ilike("habit_name", `%${habitName}%`)
        .single();

      if (habitError || !habit) {
        return {
          action: "log_habit",
          data: { habitName },
          reply: `I couldn't find a habit called "${habitName}". Check your habits list!`,
        };
      }

      const { error } = await supabase
        .from("habit_logs")
        .insert({
          user_id: userId,
          habit_id: habit.id,
          log_date: today,
          completed: true,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;
      return {
        action: "log_habit",
        data: { habitName },
        reply: `✅ Marked "${habitName}" as done! One more step toward your goals.`,
      };
    } catch (err) {
      console.error("Habit log error:", err);
      return {
        action: "log_habit",
        data: { habitName },
        reply: `I tried to complete your habit but hit an issue.`,
      };
    }
  }

  // 🍽️ CALORIE LOG
  const calorieMatch = lowerMsg.match(/(?:ate|consumed|had|logged)\s+(?:about\s+)?(\d+)\s*(?:cal|calories)/);
  if (calorieMatch) {
    const calories = parseInt(calorieMatch[1], 10);
    
    try {
      const { error } = await supabase
        .from("nutrition_logs")
        .insert({
          user_id: userId,
          log_date: today,
          calories: calories,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;
      return {
        action: "log_calories",
        data: { calories },
        reply: `🍽️ Logged ${calories} calories. Keep tracking to hit your goals!`,
      };
    } catch (err) {
      console.error("Calorie log error:", err);
      return {
        action: "log_calories",
        data: { calories },
        reply: `I tried to log ${calories} calories but something went wrong.`,
      };
    }
  }

  // 📝 ADD TASK
  const taskMatch = lowerMsg.match(/(?:add|create|remind me to)\s+(?:a\s+)?(?:task\s+)?(?:to\s+)?(.+)$/);
  if (taskMatch && (lowerMsg.includes("add") || lowerMsg.includes("create") || lowerMsg.includes("remind"))) {
    const taskTitle = taskMatch[1].trim();
    
    try {
      const { error } = await supabase
        .from("tasks")
        .insert({
          user_id: userId,
          task_date: today,
          title: taskTitle,
          category: "todo",
          completed: false,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;
      return {
        action: "add_task",
        data: { title: taskTitle },
        reply: `📝 Added "${taskTitle}" to your todo list. I'll help you stay on track!`,
      };
    } catch (err) {
      console.error("Task add error:", err);
      return {
        action: "add_task",
        data: { title: taskTitle },
        reply: `I tried to add that task but hit a snag.`,
      };
    }
  }

  // 💬 DEFAULT: Just chat
  return {
    action: "chat",
    data: {},
    reply: "",
  };
}

/**
 * Quick check if a message looks like a command (before calling AI)
 */
export function isLikelyCommand(message: string): boolean {
  const lower = message.toLowerCase();
  const commandPatterns = [
    /studied\s+\d+\s*min/,
    /did\s+(pushups|workout|exercise|gym)/,
    /completed\s+(my\s+)?habit/,
    /ate\s+\d+\s*cal/,
    /add\s+(a\s+)?task/,
    /remind me to/,
    /log\s+(my\s+)?(workout|study|calories)/,
  ];
  return commandPatterns.some((pattern) => pattern.test(lower));
}