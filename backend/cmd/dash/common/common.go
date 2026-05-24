package common

import (
	"database/sql"
	"strconv"
	"time"

	"github.com/zhengkyl/wordmongering/backend/cmd/dash/keymap"
)

const (
	MaxWords = 15
	PageSize = 10
)

var Epoch = time.Date(2026, time.April, 26, 0, 0, 0, 0, time.UTC)

func DayToDate(day int) time.Time {
	return Epoch.AddDate(0, 0, day)
}

func DayLabel(day int) string {
	d := DayToDate(day)
	return d.Format("Mon, Jan 02") + DimStyle.Render(" · "+strconv.Itoa(day))
}

type Global struct {
	DB         *sql.DB
	KeyMap     keymap.KeyMap
	PuzzlePath string
	Words      []string
}

type Props struct {
	Width  int
	Height int
	Global Global
}
